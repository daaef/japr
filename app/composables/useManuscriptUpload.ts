export interface UploadedManuscript {
  fileKey: string
  journalFormat: string
  originalName: string
}

/**
 * Uploads a manuscript file and returns the stored-file record.
 *
 * On Vercel (`NUXT_PUBLIC_DIRECT_UPLOAD=true`) the browser uploads straight to
 * Vercel Blob via a short-lived token, bypassing the ~4.5MB serverless body
 * limit. Do not set `multipart: true` here — manuscripts are capped at
 * MAX_FILE_SIZE_MB and single-object client PUT is sufficient; MPU triggers
 * `/api/blob/mpu` which fails cross-origin from custom domains.
 * Otherwise it posts multipart to the server (local disk / Docker).
 */
export function useManuscriptUpload() {
  const config = useRuntimeConfig()

  async function uploadManuscript(file: File): Promise<UploadedManuscript> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'

    if (config.public.directUpload) {
      const { upload } = await import('@vercel/blob/client')
      const result = await upload(`journals/${crypto.randomUUID()}.${extension}`, file, {
        access: 'public',
        handleUploadUrl: '/api/files/upload-token'
      })

      return {
        fileKey: result.pathname,
        journalFormat: `.${extension}`,
        originalName: file.name
      }
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await $fetch<{ files: UploadedManuscript[] }>('/api/files/upload', {
      method: 'POST',
      body: formData
    })

    const uploaded = response.files[0]
    if (!uploaded) {
      throw new Error('Upload did not return a file.')
    }

    return uploaded
  }

  return { uploadManuscript }
}
