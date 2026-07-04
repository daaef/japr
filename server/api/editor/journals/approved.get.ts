import { getValidatedQuery } from 'h3'
import { listJournalsByStatus } from '#server/utils/journalQueue'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { paginationSchema } from '#shared/validation/common'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  return listJournalsByStatus(query, [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT])
})
