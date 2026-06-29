import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { getStoredFile } from '#server/utils/files'
import { getCurrentUserContext } from '#server/utils/session'
import { getJournalById } from '#server/utils/submissions'
import { isEditorialProfileRole } from '#server/utils/permissions'
import { resolveManuscriptPreviewFile } from '#server/utils/manuscriptPreviewFile'

export default defineEventHandler(async (event) => {
  const context = await getCurrentUserContext(event)

  if (!context.authenticated || !context.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)

  if (!journal?.journalUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Preview not available.' })
  }

  const userId = context.session.user.id
  const isOwner = journal.userId === userId
  const isEditor = context.roles.some(role => isEditorialProfileRole(role))
  let isAssignedReviewer = false

  if (!isOwner && !isEditor) {
    const assignment = await db.query.reviewers.findFirst({
      where: and(eq(reviewers.userId, userId), eq(reviewers.journalId, journal.id)),
      columns: { id: true }
    })
    isAssignedReviewer = !!assignment
  }

  if (!isOwner && !isEditor && !isAssignedReviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to view this document.' })
  }

  const resolved = resolveManuscriptPreviewFile(journal.journalUrl)
  const { stream, size, contentType } = await getStoredFile(resolved.storageKey)

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Content-Disposition': 'inline',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })

  return sendStream(event, stream)
})
