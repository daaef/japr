import { eq } from 'drizzle-orm'
import { getValidatedQuery } from 'h3'
import { reviewers } from '#server/db/schema'
import { requireReviewer } from '#server/utils/permissions'
import { listReviewerAssignments } from '#server/utils/reviewerQueue'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'
import { paginationSchema } from '#shared/validation/common'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const query = await getValidatedQuery(event, value => paginationSchema.parse(value))
  return listReviewerAssignments(
    session.user.id,
    query,
    eq(reviewers.status, REVIEWER_STATUS.DECLINED)
  )
})
