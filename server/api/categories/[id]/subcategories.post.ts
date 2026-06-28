import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { subCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { subCategoryCreateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => subCategoryCreateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing category id.' })
  }

  const inserted = await db.insert(subCategories).values({
    name: body.name,
    slug: slugify(body.name),
    categoryId: id
  }).returning()

  const subCategory = inserted[0]!

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'sub_category',
    resourceId: subCategory.id,
    description: `Created subcategory ${subCategory.name}`,
    newValues: subCategory,
    metadata: { categoryId: id }
  })

  return { subCategory }
})
