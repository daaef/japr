import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { requirePermission } from '#server/utils/permissions'
import { buildApprovedExtension, getDefaultReviewDeadline } from '#server/utils/reviewerDeadlines'
import { getJournalById } from '#server/utils/submissions'

const bodySchema = z.object({
  reviewerId: z.string().uuid(),
  extensionDays: z.number().int().min(1).max(90).default(7)
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'reviewer', 'assign')
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
    where: (table, { and, eq }) => and(eq(table.id, body.reviewerId), eq(table.journalId, journal.id))
  })

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Reviewer assignment not found.' })
  }

  const currentDeadline = reviewer.reviewDeadline
    ?? getDefaultReviewDeadline(reviewer.assignedAt ?? new Date())
  const extension = buildApprovedExtension(currentDeadline, body.extensionDays)

  await db.update(reviewers).set({
    ...extension,
    updatedAt: new Date()
  }).where(eq(reviewers.id, reviewer.id))

  return { ok: true }
})
