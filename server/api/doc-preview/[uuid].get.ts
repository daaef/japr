import { and, eq } from 'drizzle-orm'
import { getRouterParam } from 'h3'
import { getJournalById } from '#server/utils/submissions'
import { getCurrentUserContext } from '#server/utils/session'
import { db } from '#server/db/client'
import { reviewers } from '#server/db/schema'
import { isEditorialProfileRole } from '#server/utils/permissions'
import {
  convertDocToHtml,
  injectWatermark,
  injectProtection,
  sanitizePreviewHtml,
  wrapHtmlDocument,
  getPreviewType
} from '#server/services/docPreview'
import { resolveStoredFilePath } from '#server/utils/files'
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

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)

  if (!journal?.journalUrl) {
    throw createError({ statusCode: 404, statusMessage: 'Preview not available.' })
  }

  // Check permissions:
  // 1. Author owns the manuscript
  // 2. User has editor/admin roles
  // 3. User is an assigned reviewer for this manuscript
  const userId = context.session.user.id
  const userRoles = context.roles
  const userEmail = context.session.user.email
  const isOwner = journal.userId === userId
  const isEditor = userRoles.some(role => isEditorialProfileRole(role))

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

  const resolved = resolveManuscriptPreviewFile(journal.journalUrl)
  assertManuscriptFileExists(resolved.storageKey)

  // Set security headers
  setResponseHeaders(event, {
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  })

  const previewType = resolved.previewType === 'unsupported'
    ? getPreviewType(journal.journalUrl)
    : resolved.previewType

  // Handle PDF - return direct URL for iframe embed
  if (previewType === 'pdf') {
    return {
      type: 'pdf',
      url: `/api/doc-preview/${journal.id}/file`,
      title: journal.title
    }
  }

  // Handle DOC/DOCX - convert to HTML with Pandoc
  if (previewType === 'doc') {
    try {
      const filePath = resolveStoredFilePath(resolved.storageKey)
      let html = await convertDocToHtml(filePath)

      html = sanitizePreviewHtml(html)
      html = injectWatermark(html, userEmail || 'viewer')
      html = injectProtection(html)
      html = wrapHtmlDocument(html, journal.title)

      return {
        type: 'html',
        html,
        title: journal.title
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
