import { desc, eq, gte } from 'drizzle-orm'
import { db } from '#server/db/client'
import { adminAuditLogs, users } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const now = new Date()
  const windowStart = new Date(now)
  windowStart.setUTCDate(windowStart.getUTCDate() - 29)
  windowStart.setUTCHours(0, 0, 0, 0)

  const rows = await db
    .select({
      id: adminAuditLogs.id,
      userId: adminAuditLogs.userId,
      userName: users.fullname,
      userEmail: users.email,
      action: adminAuditLogs.action,
      resourceType: adminAuditLogs.resourceType,
      resourceId: adminAuditLogs.resourceId,
      description: adminAuditLogs.description,
      riskLevel: adminAuditLogs.riskLevel,
      createdAt: adminAuditLogs.createdAt
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.userId, users.id))
    .where(gte(adminAuditLogs.createdAt, windowStart))
    .orderBy(desc(adminAuditLogs.createdAt))

  const today = dayKey(now)
  const dailyCounts = new Map<string, number>()
  const actionCounts = new Map<string, number>()
  const userCounts = new Map<string, { name: string, email: string | null, count: number }>()

  for (let index = 0; index < 30; index++) {
    const day = new Date(windowStart)
    day.setUTCDate(windowStart.getUTCDate() + index)
    dailyCounts.set(dayKey(day), 0)
  }

  for (const row of rows) {
    const key = dayKey(row.createdAt)
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1)
    actionCounts.set(row.action, (actionCounts.get(row.action) ?? 0) + 1)

    if (row.userId) {
      const user = userCounts.get(row.userId) ?? {
        name: row.userName ?? 'Unknown admin',
        email: row.userEmail,
        count: 0
      }
      user.count += 1
      userCounts.set(row.userId, user)
    }
  }

  return {
    totalActions: rows.length,
    activeAdminUsers: userCounts.size,
    highRiskActions: rows.filter(row => row.riskLevel === 'high').length,
    actionsToday: rows.filter(row => dayKey(row.createdAt) === today).length,
    dailyActivity: [...dailyCounts.entries()].map(([label, count]) => ({ label, count })),
    actionsByType: [...actionCounts.entries()]
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    activeUsers: [...userCounts.entries()]
      .map(([userId, user]) => ({ userId, ...user }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recentHighRisk: rows
      .filter(row => row.riskLevel === 'high')
      .slice(0, 10)
  }
})
