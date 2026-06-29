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
  const code = randomInt(100000, 1000000).toString()

  // Atomic: never leave a half-created user (orphaned account/activation) that
  // would dead-end a retry on the duplicate-email 409 check above.
  const user = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
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

    await tx.insert(accounts).values({
      id: randomUUID(),
      userId: created!.id,
      accountId: created!.id,
      providerId: 'credential',
      password
    })

    await tx.insert(activations).values({
      email: created!.email,
      code,
      userId: created!.id
    })

    return created!
  })

  // The account exists after commit; an email outage must not 500 the request
  // (that turns retries into a permanent 409 trap). Surface delivery status so
  // the client can point the user at "Resend code".
  let emailDelivered = true
  try {
    await sendRegistrationEmail(user.email, user.fullname)
    await sendActivationEmail(user.email, user.fullname, code)
  } catch (error) {
    emailDelivered = false
    console.error('Sign-up email delivery failed:', error)
  }

  return {
    ok: true,
    emailDelivered,
    message: emailDelivered
      ? 'Registration successful. Check your email for the activation code.'
      : 'Account created, but we could not send your activation email. Use “Resend code” on the activation page.'
  }
})
