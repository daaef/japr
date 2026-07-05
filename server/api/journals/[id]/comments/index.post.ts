import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journalComments } from '#server/db/schema'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { isPubliclyVisibleJournal } from '#server/utils/journal-visibility'
import { resolveJournalViewerRole } from '#server/utils/journal-viewer-role'
import { requireSession } from '#server/utils/session'
import { commentCreateSchema } from '#shared/validation/categories'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = getRouterParam(event, 'id')
  const body = await readValidatedBody(event, payload => commentCreateSchema.parse(payload))

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

  const inserted = await db.insert(journalComments).values({
    userId: session.user.id,
    journalId: id,
    comment: body.comment
  }).returning()

  return { comment: inserted[0] }
})
