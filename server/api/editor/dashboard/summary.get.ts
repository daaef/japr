import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { buildEditorDashboardSummary } from '#server/utils/dashboardSummary'
import { requireEditor } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireEditor(event)

  const rows = await db
    .select({ approvalStatus: journals.approvalStatus, copyEditStatus: journals.copyEditStatus })
    .from(journals)

  return {
    summary: buildEditorDashboardSummary(rows)
  }
})
