import { getQuery } from 'h3'
import { db } from '#server/db/client'
import { getCurrentUserContext } from '#server/utils/session'

// Deliberately non-mutating (F5) and no longer skips the reviewPolicyAccepted gate
// that accept.post.ts enforces (F6): this only validates the token/session and hands
// off to the confirm page, which calls accept.post.ts to actually record the response.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const token = String(query.token ?? '')

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Missing invitation token.' })
  }

  const context = await getCurrentUserContext(event)
  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { eq }) => eq(table.token, token)
  })

  if (!reviewer) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found.' })
  }

  const confirmPath = `/reviewer/invitations/respond?token=${encodeURIComponent(token)}&action=accept`

  if (!context.authenticated) {
    return sendRedirect(event, `/auth/login?redirect=${encodeURIComponent(confirmPath)}`)
  }

  if (reviewer.userId !== context.user!.id) {
    throw createError({ statusCode: 403, statusMessage: 'This invitation belongs to another user.' })
  }

  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, reviewer.journalId),
    columns: { title: true }
  })

  return sendRedirect(event, journal
    ? `${confirmPath}&title=${encodeURIComponent(journal.title)}`
    : confirmPath)
})
