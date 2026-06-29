import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { readBody, toWebRequest } from 'h3'
import { getAllowedMimeTypes, getMaxFileSizeBytes } from '#server/utils/files'
import { requireSession } from '#server/utils/session'

/**
 * Issues short-lived client tokens for direct browser→Vercel Blob uploads,
 * bypassing the ~4.5MB serverless request-body limit. The session is enforced
 * inside onBeforeGenerateToken (the Blob upload-completed callback hits this
 * same route server-to-server and must not require a user session).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<HandleUploadBody>(event)

  return handleUpload({
    body,
    request: toWebRequest(event),
    onBeforeGenerateToken: async () => {
      await requireSession(event)
      return {
        allowedContentTypes: getAllowedMimeTypes(),
        maximumSizeInBytes: getMaxFileSizeBytes(),
        addRandomSuffix: false
      }
    },
    onUploadCompleted: async () => {
      // The journal/revision row is persisted later with the returned pathname.
    }
  })
})
