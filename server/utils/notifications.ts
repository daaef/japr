import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { userAllowsRealtimeNotifications } from '#server/utils/notificationPreferences'
import { publishNotification } from '#server/utils/notificationStream'

export async function createNotification(input: {
  userId: string
  type: string
  data: Record<string, unknown>
}) {
  const inserted = await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    data: input.data
  }).returning()

  const record = inserted[0] ?? null

  if (record && await userAllowsRealtimeNotifications(input.userId)) {
    publishNotification(input.userId, {
      event: 'notification.sent',
      notification: record
    })
  }

  return record
}

export async function createNotifications(input: Array<{
  userId: string
  type: string
  data: Record<string, unknown>
}>) {
  if (!input.length) {
    return []
  }

  const inserted = await db.insert(notifications).values(input).returning()

  await Promise.all(inserted.map(async (record) => {
    if (await userAllowsRealtimeNotifications(record.userId)) {
      publishNotification(record.userId, {
        event: 'notification.sent',
        notification: record
      })
    }
  }))

  return inserted
}
