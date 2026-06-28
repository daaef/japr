import { db } from '#server/db/client'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const [journal, reviewerRecord, peerReviews] = await Promise.all([
    getJournalById(uuid),
    db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, uuid), eq(table.userId, session.user.id))
    }),
    db.query.reviewers.findMany({
      where: (table, { eq }) => eq(table.journalId, uuid)
    })
  ])

  if (!journal || !reviewerRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Review assignment not found.' })
  }

  return {
    journal,
    reviewer: reviewerRecord,
    peerReviews: peerReviews.filter(review => review.userId !== session.user.id).map(review => ({
      id: review.id,
      comment: review.comment,
      recommendation: review.recommendation,
      rating: review.rating
    }))
  }
})
