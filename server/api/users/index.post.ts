import { randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { accounts, userRoles, users } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { sendAdminCreatedUserEmail } from '#server/utils/email'
import { requireAdmin } from '#server/utils/permissions'
import { userCreateSchema } from '#shared/validation/users'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, payload => userCreateSchema.parse(payload))

  const password = await hashPassword(body.password)

  // users/accounts/userRoles commit together (B7) — a crash mid-sequence must not leave a
  // user row with no credential row (unable to log in) or missing roles (unable to do
  // anything after logging in).
  const user = await db.transaction(async (tx) => {
    const inserted = await tx.insert(users).values({
      name: body.fullname,
      fullname: body.fullname,
      username: body.username,
      email: body.email,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      passwordHash: password,
      country: body.country ?? null,
      institution: body.institution ?? null,
      isActive: true
    }).returning()

    const createdUser = inserted[0]!

    await tx.insert(accounts).values({
      id: randomUUID(),
      userId: createdUser.id,
      accountId: createdUser.id,
      providerId: 'credential',
      password
    })

    for (const roleId of body.roleIds) {
      await tx.insert(userRoles).values({
        userId: createdUser.id,
        roleId
      })
    }

    return createdUser
  })

  await logAdminAction(event, {
    action: 'create',
    resourceType: 'user',
    resourceId: user.id,
    description: `Created user ${user.email}`,
    newValues: {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      username: user.username,
      roleIds: body.roleIds
    }
  })

  try {
    await sendAdminCreatedUserEmail(user.email, user.fullname, body.password)
  } catch (error) {
    console.error('Failed to send admin-created user email:', error)
  }

  return { user }
})
