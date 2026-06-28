import { mkdir, stat, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { createId } from './ids'

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

export async function ensureUploadDirectory(subdir?: string) {
  const directory = subdir ? join(getUploadDir(), subdir) : getUploadDir()
  await mkdir(directory, { recursive: true })
  return directory
}

export async function persistUpload(input: {
  data: Buffer
  originalName: string
  subdir: string
}) {
  const extension = extname(input.originalName) || '.bin'
  const filename = `${createId()}${extension}`
  const directory = await ensureUploadDirectory(input.subdir)
  const storagePath = join(directory, filename)
  await writeFile(storagePath, input.data)

  return {
    filename,
    storagePath,
    storageKey: normalizeStoredFileKey(storagePath)
  }
}

export function createFileStream(storagePath: string) {
  return createReadStream(storagePath)
}

export function normalizeStoredFileKey(storagePath: string) {
  const uploadDir = getUploadDir()
  const relativePath = relative(uploadDir, storagePath)
  return relativePath.split('\\').join('/').replace(/^\/+/, '')
}

export function resolveStoredFilePath(storageKey: string) {
  return join(getUploadDir(), storageKey.replace(/^\/+/, ''))
}

export async function getStoredFileStats(storageKey: string) {
  return stat(resolveStoredFilePath(storageKey))
}
