import { randomInt } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { activations, users } from '#server/db/schema'
import { sendActivationEmail } from '#server/utils/email'

const resendActivationSchema = z.object({
  email: z.email()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, payload => resendActivationSchema.parse(payload))

  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email)
  })

  if (!user || user.emailVerified) {
    return { ok: true }
  }

  const code = randomInt(100000, 1000000).toString()
  const existing = await db.query.activations.findFirst({
    where: eq(activations.email, body.email)
  })

  if (existing) {
    await db
      .update(activations)
      .set({ code, userId: user.id })
      .where(and(eq(activations.email, body.email), eq(activations.id, existing.id)))
  } else {
    await db.insert(activations).values({
      email: body.email,
      code,
      userId: user.id
    })
  }

  await sendActivationEmail(user.email, user.fullname, code)

  return {
    ok: true,
    message: 'A new activation code has been sent to your email.'
  }
})
