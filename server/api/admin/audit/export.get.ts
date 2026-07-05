import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { adminAuditLogs, users } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

function escapeCsvField(value: string) {
  // Prefix values starting with =, +, -, or @ so spreadsheet apps (Excel, Sheets)
  // don't interpret them as formulas when the CSV is opened.
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value

  if (guarded.includes('"') || guarded.includes(',') || guarded.includes('\n')) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const conditions = []

  if (typeof query.userId === 'string') conditions.push(eq(adminAuditLogs.userId, query.userId))
  if (typeof query.action === 'string' && query.action) conditions.push(eq(adminAuditLogs.action, query.action))
  if (typeof query.resourceType === 'string' && query.resourceType) conditions.push(eq(adminAuditLogs.resourceType, query.resourceType))
  if (typeof query.riskLevel === 'string' && query.riskLevel) conditions.push(eq(adminAuditLogs.riskLevel, query.riskLevel))
  if (typeof query.from === 'string' && query.from) conditions.push(gte(adminAuditLogs.createdAt, new Date(`${query.from}T00:00:00.000Z`)))
  if (typeof query.to === 'string' && query.to) conditions.push(lte(adminAuditLogs.createdAt, new Date(`${query.to}T23:59:59.999Z`)))

  const rows = await db
    .select({
      createdAt: adminAuditLogs.createdAt,
      userName: users.fullname,
      userEmail: users.email,
      action: adminAuditLogs.action,
      resourceType: adminAuditLogs.resourceType,
      resourceId: adminAuditLogs.resourceId,
      riskLevel: adminAuditLogs.riskLevel,
      ipAddress: adminAuditLogs.ipAddress,
      description: adminAuditLogs.description
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(adminAuditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(5000)

  const lines = [
    ['Date', 'Admin', 'Email', 'Action', 'Resource Type', 'Resource ID', 'Risk', 'IP Address', 'Description']
      .map(escapeCsvField)
      .join(',')
  ]

  for (const row of rows) {
    lines.push([
      row.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      row.userName ?? 'System',
      row.userEmail ?? '',
      row.action,
      row.resourceType,
      row.resourceId ?? '',
      row.riskLevel,
      row.ipAddress ?? '',
      row.description
    ].map(field => escapeCsvField(String(field))).join(','))
  }

  await logAdminAction(event, {
    action: 'export',
    resourceType: 'admin_audit_log',
    description: `Exported ${rows.length} audit logs`,
    metadata: { filters: query, rowCount: rows.length }
  })

  const filename = `admin_audit_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`

  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  })

  return lines.join('\n')
})
