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
  const inserted = await db.insert(users).values({
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

  const user = inserted[0]!

  await db.insert(accounts).values({
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: 'credential',
    password
  })

  for (const roleId of body.roleIds) {
    await db.insert(userRoles).values({
      userId: user.id,
      roleId
    })
  }

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
