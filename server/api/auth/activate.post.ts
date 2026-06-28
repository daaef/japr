import { and, desc, eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { activations, users } from '#server/db/schema'
import { sendWelcomeEmail } from '#server/utils/email'
import { activationSchema } from '#shared/validation/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, payload => activationSchema.parse(payload))

  const activation = await db.query.activations.findFirst({
    where: (table, { and, eq }) => and(eq(table.email, body.email), eq(table.code, body.code)),
    orderBy: (table) => [desc(table.createdAt)]
  })

  if (!activation?.userId) {
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
