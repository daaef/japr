import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { users } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })
  }

  const existing = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  const updated = await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()

  const user = updated[0]!

  await logAdminAction(event, {
    action: 'delete',
    resourceType: 'user',
    resourceId: id,
    description: `Deactivated user ${user.email}`,
    oldValues: existing,
    newValues: user
  })

  return { user }
})
