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

## Addendum (same day) — direct-to-Blob client upload + error surfacing

After deploying, an upload on Vercel failed silently. Root causes: (1) the submit page masked the real upload error, and (2) server-proxied uploads are capped at Vercel's ~4.5 MB body limit. Implemented direct browser→Blob upload to remove the cap and fixed the masking.

- **`app/pages/author/submit.vue`** — `createSubmission()` no longer overwrites a failed-upload error with the generic "Please upload your manuscript file." (returns early, keeping the real message). `uploadFile()` now delegates to `useManuscriptUpload()` and extracts `statusMessage` from `$fetch` errors. Why: surface the true failure.
- **`app/composables/useManuscriptUpload.ts`** (new) — single upload entry used by both author pages. When `config.public.directUpload` is true it dynamically imports `@vercel/blob/client` and calls `upload(pathname, file, { access:'public', handleUploadUrl:'/api/files/upload-token', multipart:true })`, returning `result.pathname` as the opaque `fileKey`; otherwise posts multipart to `/api/files/upload`. Why: bypass the ~4.5 MB limit on Vercel while keeping local/Docker on disk, and keep both pages consistent (DRY).
- **`server/api/files/upload-token.post.ts`** (new) — `handleUpload()` route issuing short-lived client tokens; `requireSession` enforced inside `onBeforeGenerateToken`, with `allowedContentTypes`/`maximumSizeInBytes` from the existing file config. Why: authorised, constrained direct uploads.
- **`app/pages/author/submissions/[id].vue`** — revision `uploadFile()` switched to `useManuscriptUpload()` with the same error extraction. Why: consistency; revisions also need direct upload on Vercel.
- **`nuxt.config.ts`** — added `runtimeConfig.public.directUpload` (env `NUXT_PUBLIC_DIRECT_UPLOAD`).
- **`.env` / `README.md`** — documented `NUXT_PUBLIC_DIRECT_UPLOAD` and the redeploy-after-config requirement; removed the "follow-up" caveat now that direct upload ships.

Stored key stays the opaque pathname (confidentiality unchanged). `pnpm typecheck` + `pnpm exec eslint` pass on all touched files. Still unverified against a live Blob store (no token locally): on Vercel set `STORAGE_DRIVER=blob`, connect a Blob store, set `NUXT_PUBLIC_DIRECT_UPLOAD=true`, redeploy, then upload.
