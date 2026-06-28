import { lt } from 'drizzle-orm'
import { readValidatedBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { adminAuditLogs } from '#server/db/schema'
import { logAdminAction } from '#server/utils/adminAudit'
import { requireAdmin } from '#server/utils/permissions'

const cleanupSchema = z.object({
  daysToKeep: z.number().int().min(30).max(365)
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, payload => cleanupSchema.parse(payload))

  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - body.daysToKeep)

  const deleted = await db
    .delete(adminAuditLogs)
    .where(lt(adminAuditLogs.createdAt, cutoff))
    .returning({ id: adminAuditLogs.id })

  await logAdminAction(event, {
    action: 'cleanup',
    resourceType: 'admin_audit_log',
    description: `Deleted ${deleted.length} audit logs older than ${body.daysToKeep} days`,
    metadata: {
      daysToKeep: body.daysToKeep,
      deletedCount: deleted.length,
      cutoff: cutoff.toISOString()
    }
  })

  return {
    deletedCount: deleted.length,
    cutoff
  }
})
