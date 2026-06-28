import { and, count, eq, isNull } from 'drizzle-orm'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)))

  return {
    unreadCount: rows[0]?.value ?? 0
  }
})
