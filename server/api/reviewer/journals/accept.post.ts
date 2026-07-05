import { and, eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsOfReviewResponse } from '#server/utils/editorNotifications'
import { assertReviewerStatus } from '#server/utils/journalWorkflow'
import { requireSession } from '#server/utils/session'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'
import { reviewInvitationTokenSchema } from '#shared/validation/reviews'

async function findReviewerInvitation(
  userId: string,
  body: { token?: string, journalId?: string }
) {
  if (body.token) {
    return db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.token, body.token!), eq(table.userId, userId))
    })
  }

  if (body.journalId) {
    return db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, body.journalId!), eq(table.userId, userId))
    })
  }

  return null
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readValidatedBody(event, payload => reviewInvitationTokenSchema.parse(payload))

  // The client-side gate (app/middleware/auth.ts) only guards the SPA route; this
  // re-verifies it server-side so it can't be bypassed by calling the API directly.
  if (!session.appUser.reviewPolicyAccepted) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You must accept the review policy before responding to review invitations.'
    })
  }

  const reviewer = await findReviewerInvitation(session.user.id, body)

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found.' })
  }

  // Idempotent: an already-accepted invitation is a no-op, not an error.
  if (reviewer.status === REVIEWER_STATUS.IN_PROGRESS) {
    return { ok: true }
  }

  assertReviewerStatus(reviewer.status, [REVIEWER_STATUS.PENDING], 'accepting this review')

  await db
    .update(reviewers)
    .set({
      isAccepted: true,
      status: REVIEWER_STATUS.IN_PROGRESS,
      updatedAt: new Date()
    })
    .where(and(eq(reviewers.id, reviewer.id), eq(reviewers.userId, session.user.id)))

  await notifyEditorsOfReviewResponse(reviewer.journalId, session.user.id, 'accepted')

  return { ok: true }
})
