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

  for (const permissionId of body.permissionIds) {
    await db.insert(rolePermissions).values({
      roleId: id,
      permissionId
    }).onConflictDoNothing()
  }

  await logAdminAction(event, {
    action: 'permission_grant',
    resourceType: 'role',
    resourceId: id,
    description: `Updated permissions for role ${id}`,
    newValues: {
      roleId: id,
      permissionIds: body.permissionIds
    }
  })

  return { ok: true }
})
