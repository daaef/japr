# Solution — Pluggable storage driver (local | Vercel Blob), PDF-first

## Proposed approach

1. **Storage driver** in `server/utils/files.ts` selected by `STORAGE_DRIVER` (`local` default, `blob` on Vercel), mirroring the `EMAIL_TRANSPORT` pattern.
   - `persistUpload`: `blob` → `put(key, data, { access: 'public', addRandomSuffix: false })`; `local` → `writeFile`. Both return the **same opaque `storageKey` shape** (`<subdir>/<id>.<ext>`) so the DB value and all API responses are unchanged.
   - New `getStoredFile(storageKey)` → `{ stream, size, contentType }`. `blob` → resolve the pathname to its Blob URL via `list({ prefix })` then `fetch` (buffered; files are small); `local` → `createReadStream` + `stat`.
   - New `storedFileExists(storageKey)` and shared `contentTypeForExtension()`.
2. **Confidentiality preserved**: the stored key is a pathname, never the public Blob URL. The Blob URL is resolved server-side only, so leaking `journalUrl` to clients stays as harmless as it is today; downloads/previews still pass through the existing owner/editor/reviewer-gated endpoints.
3. **PDF-first**: in `upload.post.ts`, only attempt LibreOffice conversion when a local `storagePath` exists (skipped on `blob`). On `blob`, DOC preview (`doc-preview/[uuid].get.ts`) and the author pre-submit preview (`files/preview.post.ts`) return a clear "download to view" message instead of invoking Pandoc. PDF preview/download work everywhere.
4. **Endpoints** `download.get.ts` and `doc-preview/[uuid]/file.get.ts` switch to `getStoredFile`; `manuscriptPreviewFile.ts` becomes driver-aware (skips the local converted-PDF sibling lookup on `blob`; `assertManuscriptFileExists` becomes async via `storedFileExists`).
5. **Config/docs**: add `STORAGE_DRIVER` (+ Vercel-managed `BLOB_READ_WRITE_TOKEN`) to `.env`/README; document the ~4.5 MB request-body limit and the direct-to-Blob follow-up.

## Alternatives rejected

- **Store the full Blob URL as `journalUrl`** — simplest read, but that URL is public and is sent to clients (incl. the public journal page) → confidentiality regression. Rejected.
- **Client direct-to-Blob upload now** — the correct path for >4.5 MB files, but larger change to the submit flow; deferred as a documented follow-up to honour the "simplest" choice.
- **External conversion API (CloudConvert)** — adds dependency + per-use cost; rejected per the PDF-first decision.

## Performance impact

Upload: one Blob `put` replaces one disk write (neutral). Read: `blob` adds one `list` + one `fetch` (buffered ≤ `MAX_FILE_SIZE_MB`) per download/preview vs a disk read — acceptable for an infrequent, auth-gated manuscript fetch. `local` path unchanged.

## Performance delta

Not benchmarked; no hot-path rendering/query/socket changes. Read adds ~2 network round-trips on `blob` only, bounded by file size (≤10 MB default).

## Trade-offs

- New dependency `@vercel/blob` — justified: native, zero-infra durable storage for the chosen backend.
- `blob` reads buffer the file in memory (small-file assumption) to avoid web/Node stream typing friction.
- ~4.5 MB server-proxied upload ceiling on Vercel until direct-to-Blob upload is added.

## Dead code audit

- `createFileStream` and `getStoredFileStats` become unused after the serve endpoints move to `getStoredFile` → removed.
- `resolveStoredFilePath` retained (still used by the local Pandoc path and local existence checks).
