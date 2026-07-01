# Problem — `/api/files/upload-token` returns 500 on manuscript submit

## Root cause

Production has `NUXT_PUBLIC_DIRECT_UPLOAD=true` (browser calls `/api/files/upload-token`), but Vercel Blob is not fully configured — most likely `BLOB_READ_WRITE_TOKEN` is missing because no Blob store is connected to the project. `handleUpload()` throws an unhandled `BlobError`, which Nitro surfaces as a generic 500.

## Symptoms

- Author submit/revision upload calls `POST /api/files/upload-token` and receives `{ statusCode: 500, statusMessage: "Server Error" }`.
- Unauthenticated calls return 401 (auth middleware), so the failure occurs after login during token generation.

## Affected files / functions

- `server/api/files/upload-token.post.ts` — `handleUpload()` / `onBeforeGenerateToken`
- `server/middleware/auth.ts` — blocks `blob.upload-completed` callbacks (secondary bug; would 401 after a successful upload)
- `app/composables/useManuscriptUpload.ts` — triggers direct upload when `directUpload` is true

## Blast radius

- Author manuscript upload on Vercel (`app/pages/author/submit.vue`, `author/submissions/[id].vue`).
- Revision uploads on production.

## Constraints

- Local/Docker must keep disk upload path (`directUpload: false`, `STORAGE_DRIVER=local`).
- Stored `fileKey` must remain an opaque pathname.
- Session must still be required for token generation.

## Edge cases

- Blob store connected but `STORAGE_DRIVER` still `local` — downloads would fail later; both env vars must be set.
- Upload-completed webhook from Vercel Blob has no user session — must not require session auth.
