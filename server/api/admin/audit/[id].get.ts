import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { adminAuditLogs, users } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing audit id.' })
  }

  const [log] = await db
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
      ipAddress: adminAuditLogs.ipAddress,
      userAgent: adminAuditLogs.userAgent,
      oldValues: adminAuditLogs.oldValues,
      newValues: adminAuditLogs.newValues,
      metadata: adminAuditLogs.metadata,
      createdAt: adminAuditLogs.createdAt
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.userId, users.id))
    .where(eq(adminAuditLogs.id, id))
    .limit(1)

  if (!log) {
    throw createError({ statusCode: 404, statusMessage: 'Audit log not found.' })
  }

  return { log }
})
