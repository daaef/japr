import { getRouterParam } from 'h3'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { isPubliclyVisibleJournal, projectJournalForViewer } from '#server/utils/journal-visibility'
import { resolveJournalViewerRole } from '#server/utils/journal-viewer-role'

export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal identifier.' })
  }

  const journal = await findJournalByParam(param)

  if (!journal || !journal.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const viewerRole = await resolveJournalViewerRole(event, journal)

  // A non-public manuscript (draft, desk review, under peer review, declined, ...) is
  // only reachable by its owner, an assigned reviewer, or an editor — everyone else 404s,
  // same as if it didn't exist, rather than leaking its existence/status.
  if (viewerRole === 'public' && !isPubliclyVisibleJournal(journal)) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  return { journal: projectJournalForViewer(journal, viewerRole) }
})
