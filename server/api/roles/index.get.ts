import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { requireAdmin } from '#server/utils/permissions'
import { permissions, rolePermissions } from '#server/db/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const roleRows = await db.query.roles.findMany()
  const permissionRows = await db
    .select({
      roleId: rolePermissions.roleId,
      permissionId: permissions.id,
      permissionName: permissions.name,
      resource: permissions.resource,
      action: permissions.action,
      scope: permissions.scope
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))

  return {
    roles: roleRows.map(role => ({
      ...role,
      permissions: permissionRows.filter(permission => permission.roleId === role.id)
    }))
  }
})
