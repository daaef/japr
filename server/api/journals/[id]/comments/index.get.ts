import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journalComments, users } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const rows = await db
    .select({
      id: journalComments.id,
      comment: journalComments.comment,
      createdAt: journalComments.createdAt,
      authorName: users.fullname
    })
    .from(journalComments)
    .innerJoin(users, eq(journalComments.userId, users.id))
    .where(eq(journalComments.journalId, id))

  return { comments: rows }
})
