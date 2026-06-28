import { and, eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { userInterests } from '#server/db/schema'
import { requireAuthor } from '#server/utils/permissions'

const bodySchema = z.object({
  categoryIds: z.array(z.string().uuid()).min(1).max(5)
})

export default defineEventHandler(async (event) => {
  const session = await requireAuthor(event)
  const body = bodySchema.parse(await readBody(event))

  const existing = await db.query.userInterests.findMany({
    where: (table, { eq }) => eq(table.userId, session.user.id)
  })

  for (const interest of existing) {
    await db.delete(userInterests).where(and(eq(userInterests.userId, session.user.id), eq(userInterests.categoryId, interest.categoryId)))
  }

  await db.insert(userInterests).values(body.categoryIds.map(categoryId => ({
    userId: session.user.id,
    categoryId
  })))

  return { ok: true }
})
