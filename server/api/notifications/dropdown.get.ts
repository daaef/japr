import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)

  const [rows, unreadRows] = await Promise.all([
    db.query.notifications.findMany({
      where: (table, { eq }) => eq(table.userId, session.user.id),
      orderBy: (table) => [desc(table.createdAt)],
      limit: 5
    }),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)))
  ])

  return {
    notifications: rows.map((notification) => {
      const data = (notification.data ?? {}) as Record<string, string | undefined>

      return {
        id: notification.id,
        type: notification.type,
        title: data.title ?? 'Notification',
        message: data.message ?? '',
        actionUrl: data.action_url ?? data.actionUrl ?? data.acceptUrl ?? '#',
        icon: data.icon ?? 'ph-bell',
        color: data.color ?? 'primary',
        createdAt: formatRelativeTime(notification.createdAt),
        isRead: notification.readAt !== null
      }
    }),
    unreadCount: unreadRows[0]?.value ?? 0
  }
})
