import { logAdminAction } from '#server/utils/adminAudit'
import { cleanupOrphanedFiles } from '#server/utils/fileOwnership'
import { requireAdmin } from '#server/utils/permissions'

/**
 * Manual escape hatch — the scheduled cron job (server/api/cron/cleanup-files.get.ts)
 * is the primary trigger now; this stays available for an operator who wants to force
 * an immediate cleanup without waiting for the next scheduled run.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const result = await cleanupOrphanedFiles()

  await logAdminAction(event, {
    action: 'cleanup',
    resourceType: 'upload',
    description: `Deleted ${result.deletedCount} orphaned upload(s) past their 24h grace window`,
    metadata: { deletedCount: result.deletedCount }
  })

  return result
})
