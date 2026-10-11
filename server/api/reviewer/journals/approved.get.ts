import { and, inArray, ne } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { journals } from '#server/db/schema'
import { requireReviewer } from '#server/utils/permissions'
import { listReviewerAssignments } from '#server/utils/reviewerQueue'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { paginationSchema } from '#shared/validation/common'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  return listReviewerAssignments(
    session.user.id,
    query,
    and(
      inArray(journals.approvalStatus, [MANUSCRIPT_STATUS.APPROVED, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT]),
      ne(journals.copyEditStatus, 'ready_for_publication'),
      ne(journals.copyEditStatus, 'published')
    )
  )
})
