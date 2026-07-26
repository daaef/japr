import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journalComments, journals, users } from '#server/db/schema'
import { sendDecisionEmail } from '#server/utils/email'
import { assertManuscriptStatus, REVIEW_QUORUM } from '#server/utils/journalWorkflow'
import { notifyReviewersOfFinalDecision } from '#server/utils/manuscriptStatusNotifications'
import { createNotification } from '#server/utils/notifications'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS, type ManuscriptStatus } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

export type JournalRow = NonNullable<Awaited<ReturnType<typeof getJournalById>>>

export interface ApproveManuscriptInput {
  journal: JournalRow
  /** The managing editor performing the approval — attributed on the journalComments row. */
  actorUserId: string
  comment?: string | null
  /** Per-endpoint allowed starting statuses (F-D keeps this a parameter, not shared). */
  allowedStatuses: ManuscriptStatus[]
  /** Used only in the assertManuscriptStatus error message. */
  action: string
  /** Text stored/emailed when the editor supplies no comment. */
  defaultComment: string
}

export interface ApproveManuscriptResult {
  finalStatus: typeof MANUSCRIPT_STATUS.APPROVED | typeof MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT
}

/**
 * The single path to `approved` / `approved_with_comment` (F-D). Before this,
 * approve.post.ts and send-approval-notice.post.ts each implemented their own version of
 * "approve this manuscript": one enforced the >=3 completed-review quorum but wrote no
 * journalComments/managingEditorNoticeSentAt; the other wrote both but never checked the
 * quorum. Same terminal state, two different guards and two different audit trails,
 * decided by which endpoint the editor happened to call. Both endpoints are now thin
 * wrappers around this function, so a manuscript can only reach `approved` through one
 * set of checks and one set of side effects.
 *
 * `allowedStatuses` stays a parameter — the two endpoints intentionally accept different
 * starting statuses (approve.post.ts also allows REVIEWED; send-approval-notice.post.ts
 * only allows READY_FOR_MANAGING_EDITOR_NOTICE) — but the quorum check, the DB write, the
 * journalComments row, the author email/notification, and the reviewer outcome
 * notification are now identical regardless of which endpoint is called.
 */
export async function approveManuscript(input: ApproveManuscriptInput): Promise<ApproveManuscriptResult> {
  const { journal, actorUserId, comment, allowedStatuses, action, defaultComment } = input

  assertManuscriptStatus(journal.approvalStatus, allowedStatuses, action)

  // Count only genuinely completed reviews, scoped to the CURRENT round (F-A): a
  // declined reviewer also has reviewSubmittedAt set, and a completed review from a
  // superseded round must not satisfy a fresh round's quorum.
  const completedReviews = await db.query.reviewers.findMany({
    where: (table, { and, eq: eqFn }) => and(
      eqFn(table.journalId, journal.id),
      eqFn(table.roundNumber, journal.currentReviewRound),
      eqFn(table.status, REVIEWER_STATUS.REVIEWED)
    )
  })

  if (completedReviews.length < REVIEW_QUORUM) {
    throw createError({
      statusCode: 409,
      statusMessage: `At least ${REVIEW_QUORUM} reviews must be completed before approval.`
    })
  }

  const finalStatus = comment ? MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT : MANUSCRIPT_STATUS.APPROVED

  await db
    .update(journals)
    .set({
      approvalStatus: finalStatus,
      editorDecisionComment: comment ?? null,
      editorDecisionDate: new Date(),
      approvedAt: new Date(),
      managingEditorNoticeSentAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(journals.id, journal.id))

  await db.insert(journalComments).values({
    userId: actorUserId,
    journalId: journal.id,
    comment: comment ?? defaultComment
  })

  const author = await db.query.users.findFirst({
    where: eq(users.id, journal.userId),
    columns: { email: true, fullname: true }
  })

  if (author) {
    try {
      await sendIfEmailAllowed(journal.userId, 'manuscript_status', () =>
        sendDecisionEmail(author.email, author.fullname, journal.title, finalStatus, comment ?? defaultComment)
      )
    } catch (error) {
      console.error('Failed to send approval email:', error)
    }
  }

  await createNotification({
    userId: journal.userId,
    type: 'journal-approved',
    data: {
      title: 'Manuscript approved',
      journalId: journal.id,
      message: `${journal.title} has been approved for publication.`
    }
  })

  // Reviewers who completed a review never learned the outcome (F13d).
  await notifyReviewersOfFinalDecision(journal.id, finalStatus)

  return { finalStatus }
}
