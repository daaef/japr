import { and, ne } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { journals } from '#server/db/schema'
import { listJournalsByStatus } from '#server/utils/journalQueue'
import { requireEditor } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { paginationSchema } from '#shared/validation/common'

export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  // Manuscripts handed off to the copy desk (copyEditStatus = 'ready_for_publication')
  // are shown in the Copy Desk queue, not the general Approved queue.
  return listJournalsByStatus(
    query,
    [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT],
    'createdAt',
    and(
      ne(journals.copyEditStatus, 'ready_for_publication'),
      ne(journals.copyEditStatus, 'published')
    )
  )
})
