import { eq } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { users } from '#server/db/schema'
import { requireSession } from '#server/utils/session'
import { reviewPolicySchema } from '#shared/validation/auth'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  await readValidatedBody(event, payload => reviewPolicySchema.parse(payload))

  await db
    .update(users)
    .set({
      reviewPolicyAccepted: true,
      reviewPolicyAcceptedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, session.user.id))

  return { ok: true }
})
