import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { notifyAuthorOfManuscriptStatus } from '#server/utils/manuscriptStatusNotifications'
import { MANUSCRIPT_STATUS, REVIEW_STAGE_STATUSES, isManuscriptStatus, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS, isReviewerStatus, type ReviewerStatus } from '#shared/constants/reviewerStatus'

export type WorkflowStatus =
  | typeof MANUSCRIPT_STATUS.IN_PROGRESS
  | typeof MANUSCRIPT_STATUS.UNDER_PEER_REVIEW
  | typeof MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE
  | typeof MANUSCRIPT_STATUS.REVIEWED

export const MIN_PEER_REVIEWS_FOR_NOTICE = 2

interface ReviewerWorkflowInput {
  status: string
}

export function reviewerResponseIsTerminal(reviewer: ReviewerWorkflowInput) {
  return reviewer.status === REVIEWER_STATUS.REVIEWED || reviewer.status === REVIEWER_STATUS.DECLINED
}

export function getCompletedReviewCount(reviewers: ReviewerWorkflowInput[]) {
  return reviewers.filter(item => item.status === REVIEWER_STATUS.REVIEWED).length
}

export function getReviewWorkflowStatus(reviewers: ReviewerWorkflowInput[]): WorkflowStatus {
  const completedReviews = getCompletedReviewCount(reviewers)
  const allResponded = reviewers.length > 0 && reviewers.every(reviewerResponseIsTerminal)

  if (completedReviews >= MIN_PEER_REVIEWS_FOR_NOTICE) {
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

export async function syncJournalReviewStatus(journalId: string): Promise<ManuscriptStatus> {
  const journal = await db.query.journals.findFirst({
    where: (table, { eq: eqFn }) => eqFn(table.id, journalId)
  })

  if (!journal) {
    return MANUSCRIPT_STATUS.IN_PROGRESS
  }

  // Never let a late reviewer action overwrite an editor/terminal decision.
  // Only recompute while the manuscript is still in a peer-review stage.
  const inReviewStage = REVIEW_STAGE_STATUSES.some(status => status === journal.approvalStatus)
  if (!inReviewStage) {
    return journal.approvalStatus
  }

  const journalReviewers = await db.query.reviewers.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.journalId, journalId)
  })

  const approvalStatus = getReviewWorkflowStatus(journalReviewers)

  // No real transition — don't rewrite the row or re-notify the author.
  if (approvalStatus === journal.approvalStatus) {
    return approvalStatus
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
