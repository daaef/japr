import { and, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journalDislikes, journalLikes } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  await db.delete(journalDislikes).where(and(
    eq(journalDislikes.userId, session.user.id),
    eq(journalDislikes.journalId, id)
  ))

  await db.insert(journalLikes).values({
    userId: session.user.id,
    journalId: id
  }).onConflictDoNothing()

  return { ok: true }
})
