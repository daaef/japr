import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { users } from '#server/db/schema'
import { defaultNotificationPreferences, type NotificationPreferences } from '#shared/validation/notifications'

export type NotificationEmailCategory = keyof NotificationPreferences['email']

export function preferencesAllowRealtime(preferences: NotificationPreferences | null | undefined) {
  return (preferences ?? defaultNotificationPreferences).in_app.realtime
}

export async function userAllowsEmail(userId: string, category: NotificationEmailCategory) {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { notificationPreferences: true }
  })

  const prefs = row?.notificationPreferences ?? defaultNotificationPreferences
  return prefs.email[category] ?? true
}

export async function userAllowsRealtimeNotifications(userId: string) {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { notificationPreferences: true }
  })

  return preferencesAllowRealtime(row?.notificationPreferences ?? null)
}

export async function sendIfEmailAllowed(
  userId: string,
  category: NotificationEmailCategory,
  send: () => Promise<unknown>
) {
  if (await userAllowsEmail(userId, category)) {
    return send()
  }
}
