import { eq } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { journals } from '#server/db/schema'
import { listJournalsByStatus } from '#server/utils/journalQueue'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { paginationSchema } from '#shared/validation/common'

// Distinct from /api/editor/journals/approved (every approved manuscript, used by the
// editor's general "approved" page) — the copy desk only sees manuscripts an editor has
// actually handed off via approve-for-publication.post.ts (F12).
export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  return listJournalsByStatus(
    query,
    [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT],
    'createdAt',
    eq(journals.copyEditStatus, 'ready_for_publication')
  )
})
