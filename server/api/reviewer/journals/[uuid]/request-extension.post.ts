import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { notifyEditorsReviewExtensionRequested } from '#server/utils/editorNotifications'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'

const bodySchema = z.object({
  reason: z.string().trim().min(5).max(1000)
})

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const uuid = getRouterParam(event, 'uuid')
  const body = bodySchema.parse(await readBody(event))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, session.user.id))
  })

  if (!reviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned as a reviewer for this journal.' })
  }

  await db.update(reviewers).set({
    deadlineExtensionRequested: true,
    deadlineExtensionReason: body.reason,
    updatedAt: new Date()
  }).where(eq(reviewers.id, reviewer.id))

  await notifyEditorsReviewExtensionRequested(journal.id, session.user.id, body.reason)

  return { ok: true }
})
