import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import { Readable } from 'node:stream'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { list, put } from '@vercel/blob'
import { createId } from './ids'

const storageDriver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase()

export function isBlobStorage() {
  return storageDriver === 'blob'
}

export function getUploadDir() {
  const configured = process.env.UPLOAD_DIR ?? './uploads'
  return isAbsolute(configured) ? configured : resolve(process.cwd(), configured)
}

export function getAllowedMimeTypes() {
  const configured = process.env.ALLOWED_MIME_TYPES ?? 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return configured.split(',').map(entry => entry.trim()).filter(Boolean)
}

export function getMaxFileSizeBytes() {
  const mb = Number(process.env.MAX_FILE_SIZE_MB ?? '10')
  return Math.max(1, mb) * 1024 * 1024
}

export function contentTypeForExtension(storageKey: string) {
  switch (extname(storageKey).toLowerCase()) {
    case '.pdf':
      return 'application/pdf'
    case '.doc':
      return 'application/msword'
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default:
      return 'application/octet-stream'
  }
}

export async function ensureUploadDirectory(subdir?: string) {
  const directory = subdir ? join(getUploadDir(), subdir) : getUploadDir()
  await mkdir(directory, { recursive: true })
  return directory
}

export function normalizeStoredFileKey(storagePath: string) {
  const uploadDir = getUploadDir()
  const relativePath = relative(uploadDir, storagePath)
  return relativePath.split('\\').join('/').replace(/^\/+/, '')
}

export function resolveStoredFilePath(storageKey: string) {
  return join(getUploadDir(), storageKey.replace(/^\/+/, ''))
}

/**
 * Persist an uploaded file. The returned `storageKey` is an opaque pathname
 * (`<subdir>/<id>.<ext>`) under both drivers so it can be stored in the DB and
 * returned to clients without leaking a directly-fetchable URL. `storagePath`
 * is the on-disk path for the local driver (used for DOC→PDF conversion) and
 * `null` for blob storage.
 */
export async function persistUpload(input: {
  data: Buffer
  originalName: string
  subdir: string
}): Promise<{ filename: string, storageKey: string, storagePath: string | null }> {
  const extension = extname(input.originalName) || '.bin'
  const filename = `${createId()}${extension}`

  if (isBlobStorage()) {
    const storageKey = `${input.subdir}/${filename}`
    await put(storageKey, input.data, {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentTypeForExtension(storageKey)
    })
    return { filename, storageKey, storagePath: null }
  }

  const directory = await ensureUploadDirectory(input.subdir)
  const storagePath = join(directory, filename)
  await writeFile(storagePath, input.data)

  return { filename, storageKey: normalizeStoredFileKey(storagePath), storagePath }
}

async function resolveBlobUrl(storageKey: string) {
  const { blobs } = await list({ prefix: storageKey, limit: 1 })
  const match = blobs.find(blob => blob.pathname === storageKey)
  return match?.url ?? null
}

export async function storedFileExists(storageKey: string) {
  if (isBlobStorage()) {
    return (await resolveBlobUrl(storageKey)) !== null
  }

  return existsSync(resolveStoredFilePath(storageKey))
}

/**
 * Read a stored file for streaming back through an auth-gated endpoint.
 * Blob files are buffered in memory (manuscripts are capped at MAX_FILE_SIZE_MB).
 */
export async function getStoredFile(storageKey: string): Promise<{ stream: Readable, size: number, contentType: string }> {
  const contentType = contentTypeForExtension(storageKey)

  if (isBlobStorage()) {
    const url = await resolveBlobUrl(storageKey)
    if (!url) {
      throw createError({ statusCode: 404, statusMessage: 'File not found in storage.' })
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw createError({ statusCode: 502, statusMessage: 'Failed to read file from storage.' })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    return { stream: Readable.from(buffer), size: buffer.byteLength, contentType }
  }

  const filePath = resolveStoredFilePath(storageKey)
  const stats = await stat(filePath)
  return { stream: createReadStream(filePath), size: stats.size, contentType }
}
