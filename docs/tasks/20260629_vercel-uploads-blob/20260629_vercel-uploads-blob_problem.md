# Problem — Manuscript uploads fail on Vercel

## Root cause

Uploads are written to and served from the local filesystem (`UPLOAD_DIR`), which is read-only and non-persistent on Vercel, and the DOC conversion/preview features shell out to LibreOffice/Pandoc binaries that exist only in the Docker image.

## Symptoms

- `POST /api/files/upload` 500s on Vercel (`persistUpload` → `writeFile` to `./uploads` on a read-only FS).
- Even if a write reached `/tmp`, later download/preview requests run in a different invocation and the file is gone.
- DOC/DOCX auto-convert (`convertDocToPdf`, LibreOffice) and DOC preview (`convertDocToHtml`, Pandoc) fail — binaries absent on Vercel.

## Affected files / functions

- `server/utils/files.ts` — `persistUpload` (write), `createFileStream`/`getStoredFileStats`/`resolveStoredFilePath` (read).
- `server/api/files/upload.post.ts:41-75` — write + LibreOffice conversion.
- `server/api/journals/[id]/download.get.ts:69-80` — disk read/stream.
- `server/api/doc-preview/[uuid]/file.get.ts:66-82` — disk read/stream.
- `server/api/doc-preview/[uuid].get.ts:67-114` — existence check + Pandoc HTML.
- `server/api/files/preview.post.ts` — `/tmp` + Pandoc.
- `server/utils/manuscriptPreviewFile.ts` — local existence/`pdfExists` checks.

## Blast radius

- Author submission + revision upload flow (`app/pages/author/submit.vue`, `author/submissions/[id].vue`).
- Manuscript download (author/editor/assigned-reviewer) and in-app preview (`useManuscriptPreview`).
- Seed `server/db/seeds/manuscriptFiles.ts` (runs locally; driver stays `local`).

## Constraints

- **Confidentiality:** `journalUrl` is returned to clients, including the public page `app/pages/journals/[slug].vue`. The stored key must stay non-resolvable by clients (no working file URL may leak). Reviewer-blind confidentiality must hold.
- Local dev / Docker must keep working on disk (LibreOffice/Pandoc conversion intact there).
- No change to the `journalUrl`/`fileKey` shape consumed by existing API responses and pages.
- Vercel serverless request-body limit (~4.5 MB) caps server-proxied uploads.

## Edge cases

- DOC/DOCX on Vercel: no conversion/HTML preview — must degrade to a clear "download to view" message, not a 500.
- Mixed records: old `local` keys vs new `blob` keys must both resolve under their driver.
- Missing/blob-deleted file → 404, not a crash.
- Files > ~4.5 MB on Vercel exceed the function body limit (documented; direct-to-Blob client upload is the follow-up).
