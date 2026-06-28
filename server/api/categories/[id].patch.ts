import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { categories } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { slugify } from '#server/utils/slug'
import { categoryUpdateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => categoryUpdateSchema.parse(payload))

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
    .set({
      ...(body.name ? { name: body.name, slug: slugify(body.name) } : {}),
      description: body.description,
      isActive: body.isActive,
    })
    .where(eq(categories.id, id))
    .returning()

  const category = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'category',
    resourceId: id,
    description: `Updated category ${category.name}`,
    oldValues: existing,
    newValues: category
  })

  return { category }
})
