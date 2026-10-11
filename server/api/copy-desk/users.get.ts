import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { roles, userRoles, users } from '#server/db/schema'
import { requirePermission } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ping', 'send')

  const userRows = await db.query.users.findMany({
    where: eq(users.isActive, true),
    orderBy: (table, { asc }) => [asc(table.fullname)]
  })

  const roleAssignments = await db
    .select({
      userId: userRoles.userId,
      roleName: roles.name
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))

  const rolesByUser = new Map<string, string[]>()
  for (const assignment of roleAssignments) {
    const list = rolesByUser.get(assignment.userId) ?? []
    list.push(assignment.roleName)
    rolesByUser.set(assignment.userId, list)
  }

  return {
    users: userRows.map(user => ({
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      username: user.username,
      roles: rolesByUser.get(user.id) ?? []
    }))
  }
})
