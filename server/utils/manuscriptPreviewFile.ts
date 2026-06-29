import { extname } from 'node:path'
import { getPdfPath, pdfExists } from '#server/services/docConversion'
import { getPreviewType } from '#server/services/docPreview'
import { isBlobStorage, normalizeStoredFileKey, resolveStoredFilePath, storedFileExists } from '#server/utils/files'

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
    // Blob storage has no on-disk converted-PDF sibling (conversion is local-only).
    if (!isBlobStorage()) {
      const fullPath = resolveStoredFilePath(storageKey)
      if (pdfExists(fullPath)) {
        return {
          previewType: 'pdf',
          storageKey: normalizeStoredFileKey(getPdfPath(fullPath))
        }
      }
    }
    return { previewType: 'doc', storageKey }
  }

  return { previewType: 'unsupported', storageKey }
}

export async function assertManuscriptFileExists(storageKey: string) {
  if (!(await storedFileExists(storageKey))) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Manuscript file not found on the server. Ask the author to re-upload the document.'
    })
  }
}

export function getManuscriptFileExtension(storageKey: string) {
  return extname(storageKey).toLowerCase()
}
