import { and, eq } from 'drizzle-orm'
import { extname } from 'node:path'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { getStoredFile } from '#server/utils/files'
import { findJournalByParam } from '#server/utils/journal-resolve'
import { getCurrentUserContext } from '#server/utils/session'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'
import { hasEditorRole } from '#shared/constants/roles'

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
  const versionId = getRouterParam(event, 'versionId')

  if (!param || !versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal or version id.' })
  }

  const [journal, version] = await Promise.all([
    findJournalByParam(param),
    db.query.manuscriptVersions.findFirst({
      where: (table, { and: andFn, eq: eqFn }) => andFn(
        eqFn(table.id, versionId),
        eqFn(table.journalId, param)
      ),
      columns: { title: true, journalUrl: true }
    })
  ])

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  if (!version || !version.journalUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Download not available for this version.' })
  }

  const userId = context.user.id
  const isOwner = journal.userId === userId
  const isEditor = hasEditorRole(context.roles)
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

  const { stream, size, contentType } = await getStoredFile(version.journalUrl)
  const filename = buildDownloadFilename(version.title, version.journalUrl)

  setResponseHeaders(event, {
    'Content-Type': contentType,
    'Content-Length': String(size),
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  })

  return sendStream(event, stream)
})
