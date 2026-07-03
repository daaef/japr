import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { activations, users } from '#server/db/schema'
import { sendWelcomeEmail } from '#server/utils/email'
import { activationSchema } from '#shared/validation/auth'

const MAX_ATTEMPTS = 5

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, payload => activationSchema.parse(payload))

  // Looked up by email alone (not email+code): a wrong-code guess must still find the
  // outstanding request so its attempt counter can be incremented.
  const activation = await db.query.activations.findFirst({
    where: (table, { eq }) => eq(table.email, body.email),
    orderBy: (table) => [desc(table.createdAt)]
  })

  if (!activation?.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid activation code.'
    })
  }

  // A NULL expiresAt means this row predates the expiry column — treat as already
  // expired rather than "no expiry," so no pre-existing code is silently permanent.
  if (!activation.expiresAt || activation.expiresAt.getTime() < Date.now()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This activation code has expired. Request a new one.'
    })
  }

  if (activation.attempts >= MAX_ATTEMPTS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Too many incorrect attempts. Request a new code.'
    })
  }

  if (activation.code !== body.code) {
    // Atomic: the WHERE clause re-checks the limit at the database row lock, so
    // concurrent wrong-code requests can't both read a stale count and both slip
    // under MAX_ATTEMPTS.
    await db
      .update(activations)
      .set({ attempts: sql`${activations.attempts} + 1` })
      .where(and(eq(activations.id, activation.id), lt(activations.attempts, MAX_ATTEMPTS)))

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid activation code.'
    })
  }

  const [user] = await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, activation.userId))
    .returning()

  await db.delete(activations).where(and(eq(activations.email, body.email), eq(activations.code, body.code)))

  if (user) {
    await sendWelcomeEmail(user.email, user.fullname)
  }

  return {
    ok: true
  }
})
