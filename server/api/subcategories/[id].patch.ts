import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { subCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { subCategoryUpdateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => subCategoryUpdateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing subcategory id.' })
  }

  const existing = await db.query.subCategories.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Sub-category not found.' })
  }

  const updated = await db
    .update(subCategories)
    .set({
      ...(body.name ? { name: body.name, slug: slugify(body.name) } : {}),
      ...(body.categoryId ? { categoryId: body.categoryId } : {})
    })
    .where(eq(subCategories.id, id))
    .returning()

  const subCategory = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'sub_category',
    resourceId: id,
    description: `Updated subcategory ${subCategory.name}`,
    oldValues: existing,
    newValues: subCategory
  })

  return { subCategory }
})
