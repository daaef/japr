import { logAdminAction } from '#server/utils/adminAudit'
import { assertCronRequest } from '#server/utils/cronAuth'
import { cleanupOrphanedFiles } from '#server/utils/fileOwnership'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)

  const result = await cleanupOrphanedFiles()

  // No session on a cron-triggered call — logAdminAction records userId: null, which
  // reads correctly as a system/automated action rather than an operator's.
  await logAdminAction(event, {
    action: 'cleanup',
    resourceType: 'upload',
    description: `Scheduled cleanup deleted ${result.deletedCount} orphaned upload(s) past their 24h grace window`,
    metadata: { deletedCount: result.deletedCount, trigger: 'cron' }
  })

  return result
})
