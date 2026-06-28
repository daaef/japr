import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { categories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing category id.' })
  }

  const existing = await db.query.categories.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
  }

  const updated = await db
    .update(categories)
    .set({ isActive: false })
    .where(eq(categories.id, id))
    .returning()

  const category = updated[0]!

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'category',
    resourceId: id,
    description: `Deactivated category ${category.name}`,
    oldValues: existing,
    newValues: category
  })

  return { ok: true }
})
