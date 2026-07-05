import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { roles, userRoles } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing user id.' })
  }

  const user = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    columns: { passwordHash: false }
  })

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' })
  }

  const assignments = await db
    .select({ roleId: roles.id, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, id))

  return { user: { ...user, assignments } }
})
