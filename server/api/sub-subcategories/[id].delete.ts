import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { subSubCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sub-subcategory id.' })
  }

  const existing = await db.query.subSubCategories.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-subcategory not found.' })
  }

  const deleted = await db
    .delete(subSubCategories)
    .where(eq(subSubCategories.id, id))
    .returning({ id: subSubCategories.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-subcategory not found.' })
  }

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'sub_sub_category',
    resourceId: id,
    description: `Deleted sub-subcategory ${existing.name}`,
    oldValues: existing
  })

  return { ok: true }
})
