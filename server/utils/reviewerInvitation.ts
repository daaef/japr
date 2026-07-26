import { db } from '#server/db/client'

/**
 * Resolves the reviewer assignment a token/journalId invitation response refers to.
 * Extracted verbatim-identical copies from accept.post.ts and decline.post.ts so the
 * round-scoping rule below lives in exactly one place.
 *
 * Token lookups are already row-precise — a token belongs to one assignment row, and
 * assign-reviewers issues a fresh token per round — so they need no round filter, and
 * must not have one: an invitation link should resolve to the row it was minted for.
 *
 * The `journalId` fallback (the in-app "accept" button, which has no token to hand) is
 * ambiguous once a manuscript has more than one round, so it is pinned to the journal's
 * current round. Without that, `findFirst` could return a superseded round's row and let
 * a reviewer respond to a closed round.
 */
export async function findReviewerInvitation(
  userId: string,
  body: { token?: string, journalId?: string }
) {
  if (body.token) {
    return db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.token, body.token!), eq(table.userId, userId))
    })
  }

  if (body.journalId) {
    const journal = await db.query.journals.findFirst({
      where: (table, { eq }) => eq(table.id, body.journalId!),
      columns: { currentReviewRound: true }
    })

    if (!journal) {
      return null
    }

    return db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(
        eq(table.journalId, body.journalId!),
        eq(table.roundNumber, journal.currentReviewRound),
        eq(table.userId, userId)
      )
    })
  }

  return null
}
