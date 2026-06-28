import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { roles } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'
import { roleCreateSchema } from '#shared/validation/roles'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, payload => roleCreateSchema.parse(payload))

  const inserted = await db.insert(roles).values({
    name: body.name,
    description: body.description ?? null,
    isSystem: false,
    isActive: true
  }).returning()

  const role = inserted[0]!

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'role',
    resourceId: role.id,
    description: `Created role ${role.name}`,
    newValues: role
  })

  return {
    role
  }
})
