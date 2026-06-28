import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { roles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing role id.' })
  }

  const existing = await db.query.roles.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Role not found.' })
  }

  if (existing.isSystem) {
    throw createError({ statusCode: 400, statusMessage: 'System roles cannot be deleted.' })
  }

  await db.delete(roles).where(eq(roles.id, id))

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'role',
    resourceId: id,
    description: `Deleted role ${existing.name}`,
    oldValues: existing
  })

  return { ok: true }
})
