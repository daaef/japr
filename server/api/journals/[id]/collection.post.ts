import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { myJournalCollections } from '#server/db/schema'
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

  const existing = await db.query.myJournalCollections.findFirst({
    where: (table, { and, eq }) => and(eq(table.userId, session.user.id), eq(table.journalId, id))
  })

  if (existing) {
    await db.delete(myJournalCollections).where(eq(myJournalCollections.id, existing.id))
    return { collected: false }
  }

  await db.insert(myJournalCollections).values({
    userId: session.user.id,
    journalId: id
  })

  return { collected: true }
})
