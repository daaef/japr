import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { notifyAuthorOfManuscriptStatus } from '#server/utils/manuscriptStatusNotifications'
import { MANUSCRIPT_STATUS, REVIEW_STAGE_STATUSES, canTransitionManuscriptStatus, isManuscriptStatus, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS, isReviewerStatus, type ReviewerStatus } from '#shared/constants/reviewerStatus'

export type WorkflowStatus =
  | typeof MANUSCRIPT_STATUS.IN_PROGRESS
  | typeof MANUSCRIPT_STATUS.UNDER_PEER_REVIEW
  | typeof MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE
  | typeof MANUSCRIPT_STATUS.REVIEWED

// Consensus quorum: a manuscript needs this many *completed* reviews before it can
// leave peer review for the managing editor's decision. Set to 3 (an odd number, so
// reviewer votes rarely tie). Declines do not count — they must be backfilled with a
// replacement reviewer. Replaces the former count-of-2 threshold.
export const REVIEW_QUORUM = 3

interface ReviewerWorkflowInput {
  status: string
}

interface ReviewerConsensusInput extends ReviewerWorkflowInput {
  recommendation?: string | null
}

export type ReviewConsensusSuggestion = 'accept' | 'reject' | 'revision' | 'inconclusive'

export interface ReviewConsensus {
  /** Number of reviewers whose review is actually completed (declines excluded). */
  completed: number
  /** True once completed reviews meet the quorum — i.e. a decision can be made. */
  ready: boolean
  /** Advisory decision for the managing editor; null until the quorum is met. */
  suggestion: ReviewConsensusSuggestion | null
}

export function reviewerResponseIsTerminal(reviewer: ReviewerWorkflowInput) {
  return reviewer.status === REVIEWER_STATUS.REVIEWED || reviewer.status === REVIEWER_STATUS.DECLINED
}

export function getCompletedReviewCount(reviewers: ReviewerWorkflowInput[]) {
  return reviewers.filter(item => item.status === REVIEWER_STATUS.REVIEWED).length
}

/** True once enough reviews are completed to make a decision (declines don't count). */
export function hasReviewQuorum(reviewers: ReviewerWorkflowInput[], quorum = REVIEW_QUORUM) {
  return getCompletedReviewCount(reviewers) >= quorum
}

/**
 * Reads the completed reviewers' recommendations and produces an *advisory* decision
 * for the managing editor. It never changes state itself — the editor confirms every
 * terminal outcome. `suggestion` is null until the quorum of completed reviews is met.
 *
 * Mapping (over completed reviews only): unanimous accept -> 'accept'; unanimous
 * reject -> 'reject'; any minor/major revision present -> 'revision'; a bare
 * accept/reject split with no revision -> 'inconclusive' (editor adjudicates).
 */
export function getReviewConsensus(
  reviewers: ReviewerConsensusInput[],
  quorum = REVIEW_QUORUM
): ReviewConsensus {
  const completedReviewers = reviewers.filter(item => item.status === REVIEWER_STATUS.REVIEWED)
  const completed = completedReviewers.length
  const ready = completed >= quorum

  if (!ready) {
    return { completed, ready: false, suggestion: null }
  }

  const recommendations = completedReviewers.map(item => (item.recommendation ?? '').toLowerCase())
  const everyIs = (value: string) => recommendations.every(rec => rec === value)
  const anyRevision = recommendations.some(rec => rec.includes('revision'))

  let suggestion: ReviewConsensusSuggestion
  if (everyIs('accept')) {
    suggestion = 'accept'
  } else if (everyIs('reject')) {
    suggestion = 'reject'
  } else if (anyRevision) {
    suggestion = 'revision'
  } else {
    suggestion = 'inconclusive'
  }

  return { completed, ready, suggestion }
}

export function getReviewWorkflowStatus(reviewers: ReviewerWorkflowInput[]): WorkflowStatus {
  const completedReviews = getCompletedReviewCount(reviewers)
  const allResponded = reviewers.length > 0 && reviewers.every(reviewerResponseIsTerminal)

  if (completedReviews >= REVIEW_QUORUM) {
    return MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE
  }

  if (allResponded) {
    return MANUSCRIPT_STATUS.REVIEWED
  }

  if (completedReviews > 0) {
    return MANUSCRIPT_STATUS.UNDER_PEER_REVIEW
  }

  return MANUSCRIPT_STATUS.IN_PROGRESS
}

/**
 * Splits already-loaded reviewer rows into the round that counts and the rounds that are
 * history. Pure and I/O-free so the F-A regression (stale reviews satisfying a new round's
 * quorum) is testable without a database — see tests/reviewRounds.test.ts.
 */
export function splitReviewerRounds<T extends { roundNumber: number }>(
  rows: T[],
  currentReviewRound: number
): { current: T[], history: T[] } {
  return {
    current: rows.filter(row => row.roundNumber === currentReviewRound),
    history: rows.filter(row => row.roundNumber !== currentReviewRound)
  }
}

/**
 * Loads the reviewer rows that *count* for a journal right now: the current round only.
 * Prior-round rows are audit history — including them is exactly the F-A bug, where three
 * completed round-1 reviews silently satisfied the quorum for a freshly revised draft.
 *
 * Every quorum, consensus, or workflow-status computation must source its rows here (or
 * apply the same filter); history/audit views deliberately do not.
 */
export function getCurrentRoundReviewers(journalId: string, currentReviewRound: number) {
  return db.query.reviewers.findMany({
    where: (table, { and, eq: eqFn }) => and(
      eqFn(table.journalId, journalId),
      eqFn(table.roundNumber, currentReviewRound)
    )
  })
}

export async function syncJournalReviewStatus(journalId: string): Promise<ManuscriptStatus> {
  const journal = await db.query.journals.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, journalId)
  })

  // Previously returned IN_PROGRESS here (F-I), which handed callers a plausible-looking
  // workflow status for a journal that doesn't exist — decline-with-comment.post.ts
  // returned that straight to the client as `approvalStatus`. Every caller resolves the
  // journal before calling, so a miss here is a genuine fault, not a state.
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Never let a late reviewer action overwrite an editor/terminal decision.
  // Only recompute while the manuscript is still in a peer-review stage.
  const inReviewStage = REVIEW_STAGE_STATUSES.some(status => status === journal.approvalStatus)
  if (!inReviewStage) {
    return journal.approvalStatus
  }

  const journalReviewers = await getCurrentRoundReviewers(journalId, journal.currentReviewRound)

  const approvalStatus = getReviewWorkflowStatus(journalReviewers)

  // No real transition — don't rewrite the row or re-notify the author.
  if (approvalStatus === journal.approvalStatus) {
    return approvalStatus
  }

  // The engine must defer to the transition table (F11), not the other way around — if a
  // future change to getReviewWorkflowStatus computes a status ALLOWED_MANUSCRIPT_TRANSITIONS
  // doesn't sanction, that's a bug to surface, not a transition to perform silently.
  if (!canTransitionManuscriptStatus(journal.approvalStatus, approvalStatus)) {
    console.error(
      `syncJournalReviewStatus: computed status "${approvalStatus}" is not an allowed transition from "${journal.approvalStatus}" for journal ${journalId}; leaving status unchanged.`
    )
    return journal.approvalStatus
  }

  await db
    .update(journals)
    .set({
      approvalStatus,
      updatedAt: new Date()
    })
    .where(eq(journals.id, journalId))

  await notifyAuthorOfManuscriptStatus(journalId, approvalStatus)

  return approvalStatus
}

export function assertManuscriptStatus(
  currentStatus: string,
  allowed: ManuscriptStatus[],
  action: string
) {
  if (!isManuscriptStatus(currentStatus) || !allowed.includes(currentStatus)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Manuscript must be ${allowed.join(' or ')} before ${action}. Current status: ${currentStatus}.`
    })
  }
}

/** The only way any endpoint should validate a reviewers.status transition. */
export function assertReviewerStatus(
  currentStatus: string,
  allowed: ReviewerStatus[],
  action: string
) {
  if (!isReviewerStatus(currentStatus) || !allowed.includes(currentStatus)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Review must be ${allowed.join(' or ')} before ${action}. Current status: ${currentStatus}.`
    })
  }
}
