import { and, eq } from 'drizzle-orm'
import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsOfReviewResponse } from '#server/utils/editorNotifications'
import { syncJournalReviewStatus } from '#server/utils/journalWorkflow'
import { getCurrentUserContext } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = String(query.token ?? '')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invitation token.' })
  }

  const context = await getCurrentUserContext(event)
  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { eq }) => eq(table.token, token)
  })

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found.' })
  }

  if (!context.authenticated) {
    return sendRedirect(event, `/auth/login?redirect=${encodeURIComponent(`/api/reviewer/journals/decline?token=${token}`)}`)
  }

  if (reviewer.userId !== context.user!.id) {
    throw createError({ statusCode: 403, statusMessage: 'This invitation belongs to another user.' })
  }

  if (reviewer.isAccepted === false || reviewer.status === 'declined') {
    return sendRedirect(event, '/reviewer/reviews')
  }

  await db.update(reviewers).set({
    isAccepted: false,
    status: 'declined',
    updatedAt: new Date()
  }).where(and(eq(reviewers.id, reviewer.id), eq(reviewers.userId, context.user!.id)))

  await syncJournalReviewStatus(reviewer.journalId)
  await notifyEditorsOfReviewResponse(reviewer.journalId, context.user!.id, 'declined')

  return sendRedirect(event, '/reviewer/reviews')
})
