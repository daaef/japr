# Plan — Vercel uploads via Blob (PDF-first)

## Steps

1. **Add dependency** — `pnpm add @vercel/blob`.
   Complexity: trivial. AC: `@vercel/blob` in dependencies.

2. **Storage driver** — refactor `server/utils/files.ts`: add `isBlobStorage()`, `contentTypeForExtension()`, driver-aware `persistUpload` (returns `storagePath: string | null`), new `getStoredFile()` and `storedFileExists()`; remove now-dead `createFileStream`/`getStoredFileStats`.
   Complexity: medium. AC: `local` writes/reads disk; `blob` writes via `put` and reads via `list`+`fetch`; `storageKey` shape unchanged.

3. **Upload conversion guard** — `server/api/files/upload.post.ts`: only run `convertDocToPdf` when `storagePath` is truthy (local).
   Complexity: trivial. AC: on `blob`, upload stores the file and returns a record with no conversion attempt; on `local`, DOC→PDF still runs.

4. **Serve endpoints** — `download.get.ts` and `doc-preview/[uuid]/file.get.ts` use `getStoredFile` (+ shared content type); drop local-only `getContentType`/`resolveStoredFilePath`/`getStoredFileStats`/`createFileStream` usage.
   Complexity: low. AC: PDF download + PDF preview stream correctly under both drivers; missing file → 404.

5. **Preview degradation** — `manuscriptPreviewFile.ts` driver-aware resolve + async `assertManuscriptFileExists`; `doc-preview/[uuid].get.ts` returns 415 "download to view" for DOC on `blob` (awaits assert); `files/preview.post.ts` returns a friendly `success:false` for DOC on `blob`. PDF paths unchanged.
   Complexity: low. AC: DOC preview on `blob` yields a clear message (no 500); PDF preview works; local Pandoc path intact.

6. **Config + docs** — add `STORAGE_DRIVER` (+ note `BLOB_READ_WRITE_TOKEN`) to `.env`/`README.md` (env + Vercel table + 4.5 MB note); write changelog; update `docs/tasks/README.md`.
   Complexity: trivial. AC: vars documented; index row added; changelog present.

7. **Verify** — `pnpm exec eslint` (touched files) + `pnpm typecheck`.
   Complexity: low. AC: lint + typecheck pass for touched files.

## Untested path disclosure

- Live Blob `put`/`list`/`fetch` not covered by automated tests (no token in CI); verified by typecheck + manual run with a Blob store. No existing tests cover the upload/serve handlers.

## Regression checklist (direct callers)

- `persistUpload`: `server/api/files/upload.post.ts`, `server/db/seeds/manuscriptFiles.ts` (local) — verify both compile and the seed still stores a local key.
- `getStoredFile` (new) consumers: `download.get.ts`, `doc-preview/[uuid]/file.get.ts`.
- `resolveManuscriptPreviewFile`/`assertManuscriptFileExists`: `doc-preview/[uuid].get.ts`, `doc-preview/[uuid]/file.get.ts` — both updated to `await` the now-async assert.
- `journalUrl` consumers (unchanged shape): `app/pages/journals/[slug].vue`, `author/submit.vue`, `author/submissions/[id].vue`, `journals/index.post.ts`, `author/submissions/[id]/revision.post.ts`.
- Removed `createFileStream`/`getStoredFileStats`: confirm no remaining importers.

## Definition of Done

- [ ] `local` (dev/Docker) upload→download→preview unchanged; lint + typecheck pass.
- [ ] `blob` upload stores durably; download + PDF preview stream through the auth-gated endpoints.
- [ ] No Blob URL is sent to clients (`journalUrl` remains an opaque pathname).
- [ ] DOC on `blob` degrades to a clear "download to view" message (no 500); LibreOffice/Pandoc skipped on `blob`.
- [ ] New dependency justified in solution.md; dead `createFileStream`/`getStoredFileStats` removed.
- [ ] `.env`, README (incl. ~4.5 MB limit note), tasks index, changelog updated.
