import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { buildEditorDashboardSummary } from '#server/utils/dashboardSummary'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)

  const rows = await db
    .select({ approvalStatus: journals.approvalStatus })
    .from(journals)

  return {
    summary: buildEditorDashboardSummary(rows)
  }
})
