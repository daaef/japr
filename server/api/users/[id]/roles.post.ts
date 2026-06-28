import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { userRoles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

const bodySchema = z.object({
  roleId: z.string().uuid()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => bodySchema.parse(payload))

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })
  }

  await db.insert(userRoles).values({
    userId: id,
    roleId: body.roleId
  }).onConflictDoNothing()

  await logAdminAction(event, {
    action: 'role_assign',
    resourceType: 'user_role',
    resourceId: id,
    description: `Assigned role ${body.roleId} to user ${id}`,
    newValues: {
      userId: id,
      roleId: body.roleId
    }
  })

  return { ok: true }
})
