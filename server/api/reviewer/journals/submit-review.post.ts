import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsAllReviewsComplete } from '#server/utils/editorNotifications'
import { assertReviewerStatus, syncJournalReviewStatus } from '#server/utils/journalWorkflow'
import { requireReviewer } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'
import { reviewSubmitSchema } from '#shared/validation/reviews'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const body = await readValidatedBody(event, payload => reviewSubmitSchema.parse(payload))

  // The client-side gate (app/middleware/auth.ts) only guards the SPA route; this
  // re-verifies it server-side so it can't be bypassed by calling the API directly.
  if (!session.appUser.reviewPolicyAccepted) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You must accept the review policy before submitting a review.'
    })
  }

  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, body.reviewerId), eq(table.userId, session.user.id))
  })

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Review assignment not found.' })
  }

  // Only an accepted, in-progress assignment can be submitted — a pending reviewer
  // never accepted, a declined reviewer opted out, and a reviewed one already submitted
  // (no self-service resubmission; an editor-approved reopen is a separate action).
  assertReviewerStatus(reviewer.status, [REVIEWER_STATUS.IN_PROGRESS], 'submitting a review')

  await db
    .update(reviewers)
    .set({
      review: body.review,
      comment: body.comment,
      confidentialComments: body.confidentialComments ?? null,
      rating: body.rating,
      criteriaRatings: body.criteriaRatings,
      recommendation: body.recommendation,
      status: REVIEWER_STATUS.REVIEWED,
      isAccepted: true,
      reviewSubmittedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(reviewers.id, reviewer.id))

  const journalReviewers = await db.query.reviewers.findMany({
    where: (table, { eq }) => eq(table.journalId, reviewer.journalId)
  })

  const allComplete = journalReviewers.every(item => item.id === reviewer.id ? true : item.status === REVIEWER_STATUS.REVIEWED)
  const approvalStatus = await syncJournalReviewStatus(reviewer.journalId)

  if (allComplete || approvalStatus === MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE) {
    await notifyEditorsAllReviewsComplete(reviewer.journalId)
  }

  // The author hears about review progress through the centralized
  // manuscript-status-changed notification emitted by syncJournalReviewStatus,
  // so we deliberately don't send a separate per-review notification here.
  return { ok: true }
})
