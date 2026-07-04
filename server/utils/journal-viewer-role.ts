import type { H3Event } from 'h3'
import { db } from '#server/db/client'
import type { JournalViewerRole, JournalVisibilityFields } from '#server/utils/journal-visibility'
import { isEditorialProfileRole } from '#server/utils/permissions'
import { getCurrentUserContext } from '#server/utils/session'

/**
 * Determines the caller's relationship to a specific manuscript. Does DB/session I/O —
 * kept out of journal-visibility.ts so that module's pure projection function stays
 * importable without pulling in h3/session (which only resolve inside Nuxt's runtime).
 */
export async function resolveJournalViewerRole(
  event: H3Event,
  journal: JournalVisibilityFields
): Promise<JournalViewerRole> {
  const context = await getCurrentUserContext(event)

  if (!context.authenticated || !context.user) {
    return 'public'
  }

  if (context.roles.some(role => isEditorialProfileRole(role))) {
    return 'editor'
  }

  if (context.user.id === journal.userId) {
    return 'owner'
  }

  const viewerId = context.user.id
  const reviewerAssignment = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(eq(table.journalId, journal.id), eq(table.userId, viewerId))
  })

  if (reviewerAssignment) {
    return 'reviewer'
  }

  return 'public'
}
