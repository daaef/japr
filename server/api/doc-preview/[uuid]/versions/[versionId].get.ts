import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { getJournalById } from '#server/utils/submissions'
import { getCurrentUserContext } from '#server/utils/session'
import { isEditorRole } from '#server/utils/permissions'
import {
  convertDocToHtml,
  injectWatermark,
  injectProtection,
  sanitizePreviewHtml,
  wrapHtmlDocument,
  getPreviewType
} from '#server/services/docPreview'
import { isBlobStorage, resolveStoredFilePath } from '#server/utils/files'
import {
  assertManuscriptFileExists,
  resolveManuscriptPreviewFile
} from '#server/utils/manuscriptPreviewFile'

export default defineEventHandler(async (event) => {
  const context = await getCurrentUserContext(event)

  if (!context.authenticated || !context.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const uuid = getRouterParam(event, 'uuid')
  const versionId = getRouterParam(event, 'versionId')

  if (!uuid || !versionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal or version id.' })
  }

  const [journal, version] = await Promise.all([
    getJournalById(uuid),
    db.query.manuscriptVersions.findFirst({
      where: (table, { and: andFn, eq: eqFn }) => andFn(
        eqFn(table.id, versionId),
        eqFn(table.journalId, uuid)
      )
    })
  ])

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  if (!version) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
  }

  if (!version.journalUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Preview not available for this version.' })
  }

  const userId = context.session.user.id
  const userRoles = context.roles
  const userEmail = context.session.user.email
  const isOwner = journal.userId === userId
  const isEditor = userRoles.some(role => isEditorRole(role))

  let isAssignedReviewer = false
  if (!isOwner && !isEditor) {
    const assignedReview = await db.query.reviewers.findFirst({
      where: and(eq(reviewers.userId, userId), eq(reviewers.journalId, journal.id)),
      columns: { id: true }
    })
    isAssignedReviewer = !!assignedReview
  }

  if (!isOwner && !isEditor && !isAssignedReviewer) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to view this document.'
    })
  }

  const resolved = resolveManuscriptPreviewFile(version.journalUrl)
  await assertManuscriptFileExists(resolved.storageKey)

  setResponseHeaders(event, {
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })

  const previewType = resolved.previewType === 'unsupported'
    ? getPreviewType(version.journalUrl)
    : resolved.previewType

  if (previewType === 'pdf') {
    return {
      type: 'pdf',
      url: `/api/doc-preview/${journal.id}/versions/${versionId}/file`,
      title: version.title
    }
  }

  if (previewType === 'doc') {
    if (isBlobStorage()) {
      throw createError({
        statusCode: 415,
        statusMessage: 'In-browser preview is unavailable for DOC/DOCX on this deployment. Please download the manuscript to view it.'
      })
    }

    try {
      const filePath = resolveStoredFilePath(resolved.storageKey)
      let html = await convertDocToHtml(filePath)

      html = sanitizePreviewHtml(html)
      html = injectWatermark(html, userEmail || 'viewer')
      html = injectProtection(html)
      html = wrapHtmlDocument(html, version.title)

      return {
        type: 'html',
        html,
        title: version.title
      }
    } catch (error) {
      console.error('Document preview error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate document preview'
      })
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Unsupported file format for preview'
  })
})
