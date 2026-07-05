import { eq } from 'drizzle-orm'
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
    eq(journals.approvalStatus, MANUSCRIPT_STATUS.DECLINED)
  )
})
