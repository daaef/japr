import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { subSubCategories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { subSubCategoryCreateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => subSubCategoryCreateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing subcategory id.' })
  }

  const inserted = await db.insert(subSubCategories).values({
    name: body.name,
    slug: slugify(body.name),
    subCategoryId: id
  }).returning()

  const subSubCategory = inserted[0]!

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'sub_sub_category',
    resourceId: subSubCategory.id,
    description: `Created sub-subcategory ${subSubCategory.name}`,
    newValues: subSubCategory,
    metadata: { subCategoryId: id }
  })

  return { subSubCategory }
})
