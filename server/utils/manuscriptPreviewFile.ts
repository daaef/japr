import { existsSync } from 'node:fs'
import { extname } from 'node:path'
import { getPdfPath, pdfExists } from '#server/services/docConversion'
import { getPreviewType } from '#server/services/docPreview'
import { normalizeStoredFileKey, resolveStoredFilePath } from '#server/utils/files'

export type ResolvedManuscriptPreview =
  | { previewType: 'pdf', storageKey: string }
  | { previewType: 'doc', storageKey: string }
  | { previewType: 'unsupported', storageKey: string }

export function resolveManuscriptPreviewFile(storageKey: string): ResolvedManuscriptPreview {
  const previewType = getPreviewType(storageKey)

  if (previewType === 'pdf') {
    return { previewType: 'pdf', storageKey }
  }

  if (previewType === 'doc') {
    const fullPath = resolveStoredFilePath(storageKey)
    if (pdfExists(fullPath)) {
      return {
        previewType: 'pdf',
        storageKey: normalizeStoredFileKey(getPdfPath(fullPath))
      }
    }
    return { previewType: 'doc', storageKey }
  }

  return { previewType: 'unsupported', storageKey }
}

export function assertManuscriptFileExists(storageKey: string) {
  const filePath = resolveStoredFilePath(storageKey)

  if (!existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Manuscript file not found on the server. Ask the author to re-upload the document.'
    })
  }

  return filePath
}

export function getManuscriptFileExtension(storageKey: string) {
  return extname(storageKey).toLowerCase()
}
