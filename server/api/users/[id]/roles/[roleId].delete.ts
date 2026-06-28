import { and, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { userRoles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const roleId = getRouterParam(event, 'roleId')

  if (!id || !roleId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user or role id.' })
  }

  await db
    .delete(userRoles)
    .where(and(eq(userRoles.userId, id), eq(userRoles.roleId, roleId)))

  await logAdminAction(event, {
    action: 'role_remove',
    resourceType: 'user_role',
    resourceId: id,
    description: `Removed role ${roleId} from user ${id}`,
    oldValues: {
      userId: id,
      roleId
    }
  })

  return { ok: true }
})
