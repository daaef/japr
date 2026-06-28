import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { categories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { categoryCreateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, payload => categoryCreateSchema.parse(payload))

  const inserted = await db.insert(categories).values({
    name: body.name,
    slug: slugify(body.name),
    description: body.description ?? null,
    isActive: body.isActive ?? true
  }).returning()

  const category = inserted[0]!

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'category',
    resourceId: category.id,
    description: `Created category ${category.name}`,
    newValues: category
  })

  return { category }
})
