import { and, eq, inArray } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { rolePermissions } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { rolePermissionAssignSchema } from '#shared/validation/roles'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => rolePermissionAssignSchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing role id.' })
  }

  const desired = new Set(body.permissionIds)

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id))

    const existingIds = new Set(existing.map(row => row.permissionId))

    const toAdd = [...desired].filter(pid => !existingIds.has(pid))
    const toRemove = [...existingIds].filter(pid => !desired.has(pid))

    if (toAdd.length) {
      await tx.insert(rolePermissions)
        .values(toAdd.map(permissionId => ({ roleId: id, permissionId })))
        .onConflictDoNothing()
    }

    if (toRemove.length) {
      await tx.delete(rolePermissions)
        .where(and(eq(rolePermissions.roleId, id), inArray(rolePermissions.permissionId, toRemove)))
    }
  })

  await logAdminAction(event, {
    action: 'permission_sync',
    resourceType: 'role',
    resourceId: id,
    description: `Synced permissions for role ${id}`,
    newValues: {
      roleId: id,
      permissionIds: body.permissionIds
    }
  })

  return { ok: true }
})
