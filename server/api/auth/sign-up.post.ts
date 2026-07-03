import { APIError } from 'better-auth/api'
import { desc } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { auth } from '~~/auth'
import { db } from '#server/db/client'
import { getAuthHeaders } from '#server/utils/session'
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

  // Goes through better-auth's own sign-up API (not a raw insert) so the
  // databaseHooks.user.create.after hook in auth.ts fires unconditionally — the same
  // hook that assigns the author role and creates the activation code for OAuth sign-ups.
  let user: { id: string, email: string }
  try {
    const result = await auth.api.signUpEmail({
      headers: getAuthHeaders(event),
      body: {
        name: body.fullname,
        fullname: body.fullname,
        username: body.username,
        email: body.email,
        password: body.password,
        country: body.country,
        institution: body.institution
      }
    })
    user = result.user
  } catch (error) {
    if (error instanceof APIError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.body?.message ?? 'Unable to create this account.'
      })
    }
    throw error
  }

  const activation = await db.query.activations.findFirst({
    where: (table, { eq }) => eq(table.userId, user.id),
    orderBy: (table) => [desc(table.createdAt)]
  })

  // The account exists after this point; an email outage must not fail the request
  // (that turns retries into a permanent 409 trap). Surface delivery status so the
  // client can point the user at "Resend code".
  let emailDelivered = true
  try {
    await sendRegistrationEmail(user.email, body.fullname)
    if (activation) {
      await sendActivationEmail(user.email, body.fullname, activation.code)
    }
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
