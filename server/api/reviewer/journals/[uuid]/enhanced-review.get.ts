import { db } from '#server/db/client'
import { projectJournalForViewer } from '#server/utils/journal-visibility'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Review assignment not found.' })
  }

  // Both lookups are scoped to the journal's current round: a reviewer working round 2
  // must get their round-2 assignment (not the round-1 row that findFirst would otherwise
  // return arbitrarily), and must not see the superseded round's peer reviews.
  const [reviewerRecord, peerReviews] = await Promise.all([
    db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(
        eq(table.journalId, uuid),
        eq(table.roundNumber, journal.currentReviewRound),
        eq(table.userId, session.user.id)
      )
    }),
    db.query.reviewers.findMany({
      where: (table, { and, eq }) => and(
        eq(table.journalId, uuid),
        eq(table.roundNumber, journal.currentReviewRound)
      )
    })
  ])

  if (!reviewerRecord) {
    throw createError({ statusCode: 404, statusMessage: 'Review assignment not found.' })
  }

  return {
    // Strips co-reviewer identities/ratings — this reviewer sees their own assignment
    // but not who else is reviewing this manuscript or what they rated it.
    journal: projectJournalForViewer(journal, 'reviewer'),
    reviewer: reviewerRecord,
    // rating is editor-only — a reviewer sees a peer's comment/recommendation, not their score.
    peerReviews: peerReviews.filter(review => review.userId !== session.user.id).map(review => ({
      id: review.id,
      comment: review.comment,
      recommendation: review.recommendation
    }))
  }
})
