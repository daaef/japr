import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { roles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { roleUpdateSchema } from '#shared/validation/roles'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => roleUpdateSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing role id.' })
  }

  const existing = await db.query.roles.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Role not found.' })
  }

  if (existing.isSystem && body.name && body.name !== existing.name) {
    throw createError({ statusCode: 400, statusMessage: 'System role names cannot be changed.' })
  }

  const updated = await db
    .update(roles)
    .set({
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      isActive: body.isActive ?? existing.isActive
    })
    .where(eq(roles.id, id))
    .returning()

  const role = updated[0]!

  await logAdminAction(event, {
    action: 'update',
    resourceType: 'role',
    resourceId: id,
    description: `Updated role ${role.name}`,
    oldValues: existing,
    newValues: role
  })

  return { role }
})
