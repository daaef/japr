import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const updated = await db
    .update(journals)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(journals.id, id))
    .returning()

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  return { ok: true }
})
