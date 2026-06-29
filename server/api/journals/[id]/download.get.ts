import { and, eq } from 'drizzle-orm'
import { extname } from 'node:path'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { getStoredFile } from '#server/utils/files'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { getCurrentUserContext } from '#server/utils/session'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'

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

  const { stream, size, contentType } = await getStoredFile(journal.journalUrl)
  const filename = buildDownloadFilename(journal.title, journal.journalUrl)

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })

  return sendStream(event, stream)
})
