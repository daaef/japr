import { randomInt, randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { users, accounts, activations } from '#server/db/schema'
import { sendActivationEmail, sendRegistrationEmail } from '#server/utils/email'
import { signUpSchema } from '#shared/validation/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, payload => signUpSchema.parse(payload))

  const [existingEmail, existingUsername] = await Promise.all([
    db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, body.email)
    }),
    db.query.users.findFirst({
      where: (table, { eq }) => eq(table.username, body.username)
    })
  ])

  if (existingEmail) {
    throw createError({ statusCode: 409, statusMessage: 'Email is already registered.' })
  }

  if (existingUsername) {
    throw createError({ statusCode: 409, statusMessage: 'Username is already taken.' })
  }

  const password = await hashPassword(body.password)
  const insertedUsers = await db.insert(users).values({
    name: body.fullname,
    fullname: body.fullname,
    username: body.username,
    email: body.email,
    emailVerified: false,
    passwordHash: password,
    country: body.country,
    institution: body.institution,
    isActive: true
  }).returning()

  const user = insertedUsers[0]!

  await db.insert(accounts).values({
    id: randomUUID(),
    userId: user.id,
    accountId: user.id,
    providerId: 'credential',
    password
  })

  const code = randomInt(100000, 1000000).toString()

  await db.insert(activations).values({
    email: user.email,
    code,
    userId: user.id
  })

  await sendRegistrationEmail(user.email, user.fullname)
  await sendActivationEmail(user.email, user.fullname, code)

  return {
    ok: true,
    message: 'Registration successful. Check your email for the activation code.'
  }
})
