import { extname } from 'node:path'
import { readMultipartFormData } from 'h3'
import { getAllowedMimeTypes, getMaxFileSizeBytes, normalizeStoredFileKey, persistUpload } from '#server/utils/files'
import { recordUploadedFile } from '#server/utils/fileOwnership'
import { requireSession } from '#server/utils/session'
import { needsPdfConversion, convertDocToPdf } from '#server/services/docConversion'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const form = await readMultipartFormData(event)

  if (!form) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No files provided.'
    })
  }

  const allowedMimeTypes = getAllowedMimeTypes()
  const maxFileSize = getMaxFileSizeBytes()
  const files = []

  for (const field of form) {
    if (!field.filename) {
      continue
    }

    if (!allowedMimeTypes.includes(field.type ?? '')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only PDF, DOC, and DOCX files are allowed.'
      })
    }

    if (field.data.byteLength > maxFileSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File exceeds the 10MB limit.'
      })
    }

    const { filename, storageKey, storagePath } = await persistUpload({
      data: Buffer.from(field.data),
      originalName: field.filename,
      subdir: 'journals'
    })

    // Same ownership record the Blob direct-upload path writes at token-mint time —
    // the local driver writes the file server-side in one request, so this happens
    // right after persisting instead of before an upload the server doesn't see yet.
    await recordUploadedFile(storageKey, session.user.id)

    const fileExt = extname(field.filename).toLowerCase()
    const fileRecord: {
      storedName: string
      originalName: string
      mimeType: string | undefined
      size: number
      fileKey: string
      journalFormat: string
      pdfPath?: string
    } = {
      storedName: filename,
      originalName: field.filename,
      mimeType: field.type,
      size: field.data.byteLength,
      fileKey: storageKey,
      journalFormat: fileExt || '.pdf'
    }

    // Auto-convert DOC/DOCX to PDF. Only on the local driver: blob storage has
    // no on-disk path and Vercel has no LibreOffice binary (PDF-first there).
    if (storagePath && needsPdfConversion(storagePath)) {
      try {
        const pdfFullPath = await convertDocToPdf(storagePath)
        fileRecord.pdfPath = normalizeStoredFileKey(pdfFullPath)
      } catch (error) {
        console.error('PDF conversion failed:', error)
        // Don't fail the upload, just log the error
        // The document can still be previewed via Pandoc
      }
    }

    files.push(fileRecord)
  }

  return { files }
})
