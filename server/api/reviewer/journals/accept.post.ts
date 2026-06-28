import { and, eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsOfReviewResponse } from '#server/utils/editorNotifications'
import { requireSession } from '#server/utils/session'
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

  if (reviewer.isAccepted === true) {
    return { ok: true }
  }

  await db
    .update(reviewers)
    .set({
      isAccepted: true,
      status: 'in-progress',
      updatedAt: new Date()
    })
    .where(and(eq(reviewers.id, reviewer.id), eq(reviewers.userId, session.user.id)))

  await notifyEditorsOfReviewResponse(reviewer.journalId, session.user.id, 'accepted')

  return { ok: true }
})
