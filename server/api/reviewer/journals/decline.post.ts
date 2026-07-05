import { and, eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsOfReviewResponse } from '#server/utils/editorNotifications'
import { assertReviewerStatus, syncJournalReviewStatus } from '#server/utils/journalWorkflow'
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

  const reviewer = await findReviewerInvitation(session.user.id, body)

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found.' })
  }

  // Idempotent: an already-declined invitation is a no-op, not an error.
  if (reviewer.status === REVIEWER_STATUS.DECLINED) {
    return { ok: true }
  }

  assertReviewerStatus(
    reviewer.status,
    [REVIEWER_STATUS.PENDING, REVIEWER_STATUS.IN_PROGRESS],
    'declining this review'
  )

  await db
    .update(reviewers)
    .set({
      isAccepted: false,
      status: REVIEWER_STATUS.DECLINED,
      updatedAt: new Date()
    })
    .where(and(eq(reviewers.id, reviewer.id), eq(reviewers.userId, session.user.id)))

  await syncJournalReviewStatus(reviewer.journalId)
  await notifyEditorsOfReviewResponse(reviewer.journalId, session.user.id, 'declined')

  return { ok: true }
})
