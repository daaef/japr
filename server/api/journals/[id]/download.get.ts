import { and, eq } from 'drizzle-orm'
import { extname } from 'node:path'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { createFileStream, getStoredFileStats, resolveStoredFilePath } from '#server/utils/files'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { getCurrentUserContext } from '#server/utils/session'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'

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

function buildDownloadFilename(title: string, storageKey: string) {
  const extension = extname(storageKey) || ''
  const safeTitle = title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
  return `${safeTitle || 'manuscript'}${extension}`
}

export default defineEventHandler(async (event) => {
  const context = await getCurrentUserContext(event)

  if (!context.authenticated || !context.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await findJournalByParam(param)

  if (!journal?.journalUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Download not available.' })
  }

  const userId = context.user.id
  const isOwner = journal.userId === userId
  const isEditor = context.roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))
  const isApproved = PUBLIC_MANUSCRIPT_STATUSES.some(status => status === journal.approvalStatus)
  let isAssignedReviewer = false

  if (!isOwner && !isEditor && !isApproved) {
    const assignment = await db.query.reviewers.findFirst({
      where: and(eq(reviewers.userId, userId), eq(reviewers.journalId, journal.id)),
      columns: { id: true }
    })
    isAssignedReviewer = !!assignment
  }

  if (!isApproved && !isOwner && !isEditor && !isAssignedReviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have permission to download this document.' })
  }

  const stats = await getStoredFileStats(journal.journalUrl)
  const filePath = resolveStoredFilePath(journal.journalUrl)
  const filename = buildDownloadFilename(journal.title, journal.journalUrl)

  setResponseHeaders(event, {
    'Content-Type': getContentType(journal.journalUrl),
    'Content-Length': String(stats.size),
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })

  return sendStream(event, createFileStream(filePath))
})
