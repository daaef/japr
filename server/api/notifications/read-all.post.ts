import { and, eq, isNull } from 'drizzle-orm'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.userId, session.user.id),
      isNull(notifications.readAt)
    ))

  return { ok: true }
})
