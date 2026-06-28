import { and, count, desc, eq, gte, lte } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { adminAuditLogs, users } from '#server/db/schema'
import { requireAdmin } from '#server/utils/permissions'
import { buildPageMeta, getPagination } from '#server/utils/pagination'
import { paginationSchema } from '#shared/validation/common'

const auditQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  action: z.string().trim().min(1).optional(),
  resourceType: z.string().trim().min(1).optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = await getValidatedQuery(event, value => auditQuerySchema.parse(value))
  const { page, pageSize, offset } = getPagination(query)

  const conditions = []

  if (query.userId) conditions.push(eq(adminAuditLogs.userId, query.userId))
  if (query.action) conditions.push(eq(adminAuditLogs.action, query.action))
  if (query.resourceType) conditions.push(eq(adminAuditLogs.resourceType, query.resourceType))
  if (query.riskLevel) conditions.push(eq(adminAuditLogs.riskLevel, query.riskLevel))
  if (query.from) conditions.push(gte(adminAuditLogs.createdAt, new Date(`${query.from}T00:00:00.000Z`)))
  if (query.to) conditions.push(lte(adminAuditLogs.createdAt, new Date(`${query.to}T23:59:59.999Z`)))

  const whereClause = conditions.length ? and(...conditions) : undefined

  const [rows, totalRows] = await Promise.all([
    db
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
        createdAt: adminAuditLogs.createdAt
      })
      .from(adminAuditLogs)
      .leftJoin(users, eq(adminAuditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(adminAuditLogs).where(whereClause)
  ])

  return {
    logs: rows,
    meta: buildPageMeta(totalRows[0]?.value ?? 0, page, pageSize)
  }
})
