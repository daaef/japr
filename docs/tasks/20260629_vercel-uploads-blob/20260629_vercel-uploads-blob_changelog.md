# Changelog — Vercel uploads via Blob (PDF-first)

## Layer 1 — High-level

Manuscript file storage is now pluggable via `STORAGE_DRIVER`. On Vercel (`blob`) uploads go to Vercel Blob instead of the read-only local disk that previously 500'd the upload endpoint; downloads and PDF previews stream back through the existing auth-gated endpoints, so files stay private and the stored key never exposes a fetchable URL. Local/Docker keep using disk (`local`) with LibreOffice/Pandoc conversion intact. PDF-first: on Vercel, DOC/DOCX are stored and downloadable but in-browser DOC preview and DOC→PDF conversion are disabled (no binaries) and degrade to a clear "download to view" message rather than erroring. Affected flows: author submit/revision upload, manuscript download, and manuscript preview.

## Layer 2 — Low-level

- **`package.json`** — added `@vercel/blob` (2.5.0). Why: native durable object storage for the chosen Vercel backend.

- **`server/utils/files.ts`** — rewritten around a storage driver.
  - Added `isBlobStorage()`, `contentTypeForExtension()`, `storedFileExists()`, `getStoredFile()` (returns `{ stream, size, contentType }`), and a private `resolveBlobUrl()` (resolves a stored pathname to its Blob URL via `list({ prefix })`).
  - `persistUpload()` now returns `storagePath: string | null` and, on `blob`, uploads via `put(key, data, { access: 'public', addRandomSuffix: false, contentType })`, returning the **pathname** as `storageKey` (not the public URL) so it can be stored/returned to clients without leaking a fetchable link.
  - Removed `createFileStream` and `getStoredFileStats` (dead after the serve endpoints moved to `getStoredFile`); kept `resolveStoredFilePath`/`normalizeStoredFileKey`/`ensureUploadDirectory` for the local path. Why: single read/write seam that both drivers implement.

- **`server/api/files/upload.post.ts`** — DOC→PDF conversion guarded with `if (storagePath && needsPdfConversion(storagePath))`. Before: always attempted LibreOffice. Now: skipped on `blob` (no on-disk path / no binary). Why: PDF-first on Vercel.

- **`server/api/journals/[id]/download.get.ts`** — replaced local `getContentType` + `getStoredFileStats` + `resolveStoredFilePath` + `createFileStream` with a single `getStoredFile()` call and streamed its result. Why: driver-agnostic serving; access checks unchanged.

- **`server/api/doc-preview/[uuid]/file.get.ts`** — same `getStoredFile()` switch; dropped the local content-type helper and the now-async file-existence assert (handled by `getStoredFile`'s 404). Why: driver-agnostic inline streaming.

- **`server/utils/manuscriptPreviewFile.ts`** — `resolveManuscriptPreviewFile()` skips the local converted-PDF sibling lookup when `isBlobStorage()`; `assertManuscriptFileExists()` is now async and uses `storedFileExists()`. Before: always probed local disk via `existsSync`/`pdfExists`. Why: those checks are meaningless against Blob.

- **`server/api/doc-preview/[uuid].get.ts`** — `await assertManuscriptFileExists(...)`; for `previewType === 'doc'` on `blob`, throws 415 "download to view" before reaching Pandoc. Before: always ran Pandoc for DOC. Why: graceful degradation on Vercel.

- **`server/api/files/preview.post.ts`** — author pre-submit DOC preview returns `{ success:false, type:'doc', message }` on `blob` instead of invoking Pandoc. PDF base64 preview path unchanged (works on Vercel). Why: avoid a 500 where Pandoc is absent.

- **`.env`** — added `STORAGE_DRIVER=local` and a commented `BLOB_READ_WRITE_TOKEN`.

- **`README.md`** — documented `STORAGE_DRIVER`/`BLOB_READ_WRITE_TOKEN` in the env list and Vercel table, plus notes on disabled DOC conversion/preview and the ~4.5 MB request-body limit.

- **`docs/tasks/README.md`** — added the `vercel-uploads-blob` index row.

## Verification

- `pnpm typecheck` — pass.
- `pnpm exec eslint` on all changed files — pass.
- Confirmed no remaining importers of the removed `createFileStream`/`getStoredFileStats`.

## Untested paths

- Live Blob `put`/`list`/`fetch` not exercised by automated tests (no token locally/CI). Manual verification needed on a Vercel deploy with a connected Blob store: upload a PDF in author submit → confirm download and in-browser preview; upload a DOC → confirm download works and preview shows the "download to view" message.
- `local` driver behaviour is unchanged and remains the dev/Docker default.

## Known follow-up

- Files larger than ~4.5 MB exceed Vercel's serverless request-body limit when proxied through `/api/files/upload`. Direct-to-Blob client upload (`@vercel/blob` client `upload()` + a `handleUpload` token route) is the fix and is deliberately out of this change's scope.
