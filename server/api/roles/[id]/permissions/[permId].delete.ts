import { and, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { rolePermissions } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const permId = getRouterParam(event, 'permId')

  if (!id || !permId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing role or permission id.' })
  }

  await db
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, id), eq(rolePermissions.permissionId, permId)))

  return { ok: true }
})
