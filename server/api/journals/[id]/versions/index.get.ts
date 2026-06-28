import { getRouterParam } from 'h3'
import { requireSession } from '#server/utils/session'
import { assertVersionAccess, listJournalVersions } from '#server/services/versions'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const journalId = getRouterParam(event, 'id')

  if (!journalId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  await assertVersionAccess(session.user.id, journalId)
  const versions = await listJournalVersions(journalId)

  return { versions }
})
