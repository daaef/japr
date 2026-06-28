import { and, count, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { db } from '#server/db/client'
import { notifications } from '#server/db/schema'
import { requireSession } from '#server/utils/session'

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfWeek() {
  const date = new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeek() {
  const date = startOfWeek()
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const userId = session.user.id
  const todayStart = startOfToday()
  const weekStart = startOfWeek()
  const weekEnd = endOfWeek()

  const baseWhere = eq(notifications.userId, userId)

  const [totalRows, unreadRows, todayRows, weekRows, highPriorityRows, byTypeRows] = await Promise.all([
    db.select({ value: count() }).from(notifications).where(baseWhere),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(baseWhere, isNull(notifications.readAt))),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(baseWhere, gte(notifications.createdAt, todayStart))),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(baseWhere, gte(notifications.createdAt, weekStart), lte(notifications.createdAt, weekEnd))),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(baseWhere, sql`${notifications.data}->>'priority' = 'high'`)),
    db
      .select({ type: notifications.type, value: count() })
      .from(notifications)
      .where(baseWhere)
      .groupBy(notifications.type)
  ])

  const byType = Object.fromEntries(
    byTypeRows.map(row => [row.type, row.value])
  )

  return {
    total: totalRows[0]?.value ?? 0,
    unread: unreadRows[0]?.value ?? 0,
    today: todayRows[0]?.value ?? 0,
    thisWeek: weekRows[0]?.value ?? 0,
    highPriority: highPriorityRows[0]?.value ?? 0,
    byType
  }
})
