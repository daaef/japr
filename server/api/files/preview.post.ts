import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readMultipartFormData } from 'h3'
import {
  convertDocToHtml,
  getPreviewType,
  injectProtection,
  injectWatermark,
  sanitizePreviewHtml,
  wrapHtmlDocument
} from '#server/services/docPreview'
import { getAllowedMimeTypes, getMaxFileSizeBytes, isBlobStorage } from '#server/utils/files'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const form = await readMultipartFormData(event)
  const fileField = form?.find(field => field.filename)

  if (!fileField?.filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No document provided.'
    })
  }

  const allowedMimeTypes = getAllowedMimeTypes()
  const maxFileSize = getMaxFileSizeBytes()

  if (!allowedMimeTypes.includes(fileField.type ?? '')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only PDF, DOC, and DOCX files are allowed.'
    })
  }

  if (fileField.data.byteLength > maxFileSize) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File exceeds the 10MB limit.'
    })
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'japr-preview-'))
  const tempPath = join(tempDir, fileField.filename)

  try {
    await writeFile(tempPath, Buffer.from(fileField.data))
    const previewType = getPreviewType(tempPath)

    if (previewType === 'pdf') {
      const base64 = Buffer.from(fileField.data).toString('base64')
      return {
        success: true,
        type: 'pdf',
        url: `data:application/pdf;base64,${base64}`,
        message: 'Preview generated successfully'
      }
    }

    if (previewType === 'doc') {
      // Pandoc is unavailable on Vercel (blob/PDF-first). Degrade with a clear
      // message instead of a 500; PDF files still preview directly above.
      if (isBlobStorage()) {
        return {
          success: false,
          type: 'doc',
          message: 'Preview is unavailable for DOC/DOCX here. Upload a PDF to preview, or submit and download to view.'
        }
      }

      let html = await convertDocToHtml(tempPath)
      html = sanitizePreviewHtml(html)
      html = injectWatermark(html, session.user.email || 'viewer')
      html = injectProtection(html)
      html = wrapHtmlDocument(html, fileField.filename)

      return {
        success: true,
        type: 'html',
        html,
        message: 'Preview generated successfully'
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported file format for preview'
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    console.error('File preview error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate document preview'
    })
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
})
