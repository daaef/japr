import { getValidatedQuery } from 'h3'
import { listJournalsByStatus } from '#server/utils/journalQueue'
import { requireEditor } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { paginationSchema } from '#shared/validation/common'

export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  return listJournalsByStatus(query, MANUSCRIPT_STATUS.UNDER_PEER_REVIEW, 'updatedAt')
})
