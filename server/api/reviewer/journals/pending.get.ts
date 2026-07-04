import { and, eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, reviewers } from '#server/db/schema'
import { requireReviewer } from '#server/utils/permissions'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const reviews = await db
    .select({
      id: reviewers.id,
      journalId: reviewers.journalId,
      journalTitle: journals.title,
      status: reviewers.status,
      assignedAt: reviewers.assignedAt,
      reviewDeadline: reviewers.reviewDeadline,
      reviewSubmittedAt: reviewers.reviewSubmittedAt,
      journalSubmittedAt: journals.createdAt
    })
    .from(reviewers)
    .innerJoin(journals, eq(reviewers.journalId, journals.id))
    .where(and(eq(reviewers.userId, session.user.id), eq(reviewers.status, REVIEWER_STATUS.PENDING)))

  const now = Date.now()

  return {
    reviews: reviews.map(review => ({
      ...review,
      recent: review.assignedAt ? now - review.assignedAt.getTime() <= 7 * 24 * 60 * 60 * 1000 : false,
      urgent: review.reviewDeadline ? review.reviewDeadline.getTime() < now : false
    }))
  }
})
