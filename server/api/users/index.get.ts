import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { roles, userRoles } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [userRows, roleRows] = await Promise.all([
    db.query.users.findMany(),
    db
      .select({
        userId: userRoles.userId,
        roleId: roles.id,
        roleName: roles.name
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
  ])

  return {
    users: userRows.map(user => ({
      ...user,
      assignments: roleRows.filter(role => role.userId === user.id)
    }))
  }
})
