import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { splitReviewerRounds } from '#server/utils/journalWorkflow'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, uuid),
    columns: { currentReviewRound: true }
  })

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const allRounds = await db.query.reviewers.findMany({
    where: (table, { eq }) => eq(table.journalId, uuid)
  })

  // `reviews` is the current round — the set every decision is made against. Superseded
  // rounds stay available to editors as `history` (an author revision opens a new round;
  // see docs/tasks/20260726_review-rounds). Pre-round data is all round 1, so this is
  // shape-compatible for every existing manuscript.
  const rounds = splitReviewerRounds(allRounds, journal.currentReviewRound)

  return {
    currentReviewRound: journal.currentReviewRound,
    reviews: rounds.current,
    history: rounds.history
  }
})
