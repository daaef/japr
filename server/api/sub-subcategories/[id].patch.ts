import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { subSubCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { subSubCategoryUpdateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => subSubCategoryUpdateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing sub-subcategory id.' })
  }

  const existing = await db.query.subSubCategories.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-subcategory not found.' })
  }

  const updated = await db
    .update(subSubCategories)
    .set({
      ...(body.name ? { name: body.name, slug: slugify(body.name) } : {}),
      ...(body.subCategoryId ? { subCategoryId: body.subCategoryId } : {})
    })
    .where(eq(subSubCategories.id, id))
    .returning()

  const subSubCategory = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'sub_sub_category',
    resourceId: id,
    description: `Updated sub-subcategory ${subSubCategory.name}`,
    oldValues: existing,
    newValues: subSubCategory
  })

  return { subSubCategory }
})
