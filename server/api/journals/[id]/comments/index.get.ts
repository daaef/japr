import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journalComments, users } from '#server/db/schema'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { isPubliclyVisibleJournal } from '#server/utils/journal-visibility'
import { resolveJournalViewerRole } from '#server/utils/journal-viewer-role'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await findJournalByParam(id)

  if (!journal || !journal.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const viewerRole = await resolveJournalViewerRole(event, journal)

  if (viewerRole === 'public' && !isPubliclyVisibleJournal(journal)) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const rows = await db
    .select({
      id: journalComments.id,
      comment: journalComments.comment,
      createdAt: journalComments.createdAt,
      authorName: users.fullname
    })
    .from(journalComments)
    .innerJoin(users, eq(journalComments.userId, users.id))
    .where(eq(journalComments.journalId, journal.id))

  return { comments: rows }
})
