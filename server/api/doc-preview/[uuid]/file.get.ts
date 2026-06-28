import { and, eq } from 'drizzle-orm'
import { extname } from 'node:path'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { createFileStream, getStoredFileStats, resolveStoredFilePath } from '#server/utils/files'
import { getCurrentUserContext } from '#server/utils/session'
import { getJournalById } from '#server/utils/submissions'
import { isEditorialProfileRole } from '#server/utils/permissions'
import {
  assertManuscriptFileExists,
  resolveManuscriptPreviewFile
} from '#server/utils/manuscriptPreviewFile'

function getContentType(storageKey: string) {
  const extension = extname(storageKey).toLowerCase()

  switch (extension) {
    case '.pdf':
      return 'application/pdf'
    case '.doc':
      return 'application/msword'
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

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
  assertManuscriptFileExists(resolved.storageKey)

  const stats = await getStoredFileStats(resolved.storageKey)
  const filePath = resolveStoredFilePath(resolved.storageKey)

  setResponseHeaders(event, {
    'Content-Type': getContentType(resolved.storageKey),
    'Content-Length': String(stats.size),
    'Content-Disposition': 'inline',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })

  return sendStream(event, createFileStream(filePath))
})
