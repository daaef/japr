import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { subCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing subcategory id.' })
  }

  const existing = await db.query.subCategories.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-category not found.' })
  }

  const deleted = await db
    .delete(subCategories)
    .where(eq(subCategories.id, id))
    .returning({ id: subCategories.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-category not found.' })
  }

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'sub_category',
    resourceId: id,
    description: `Deleted subcategory ${existing.name}`,
    oldValues: existing
  })

  return { ok: true }
})
