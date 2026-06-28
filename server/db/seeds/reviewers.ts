import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { accounts } from '../schema/auth'
import type { RoleKey } from '#shared/constants/roles'
import { userRoles } from '../schema/roles'
import { users } from '../schema/users'
import type { db } from '../client'

type Database = typeof db

const reviewerSeeds = [
  { fullname: 'Afe Editor', username: 'afe_editor', email: 'afe@example.com', password: 'password', country: 'Nigeria' },
  { fullname: 'Nani Editor', username: 'nani', email: 'nani@example.com', password: 'password', country: 'Nigeria' }
] as const

export async function seedReviewers(database: Database, roleIdMap: Map<string, string>) {
  const associateRoleId = roleIdMap.get('associate_editor' satisfies RoleKey)
  if (!associateRoleId) {
    throw new Error('Associate Editor role missing')
  }

  for (const seed of reviewerSeeds) {
    let user = await database.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, seed.email)
    })

    if (!user) {
      const password = await hashPassword(seed.password)
      const now = new Date()
      const inserted = await database.insert(users).values({
        name: seed.fullname,
        fullname: seed.fullname,
        username: seed.username,
        email: seed.email,
        emailVerified: true,
        emailVerifiedAt: now,
        passwordHash: password,
        country: seed.country,
        isActive: true,
        reviewPolicyAccepted: true
      }).returning()

      user = inserted[0]!

      await database.insert(accounts).values({
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password
      })
    }

    const existingAssignment = await database.query.userRoles.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, user!.id), eq(table.roleId, associateRoleId))
    })

    if (!existingAssignment) {
      await database.insert(userRoles).values({
        userId: user.id,
        roleId: associateRoleId
      })
    }
  }
}
