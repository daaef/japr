# Changelog — Upload-token 500 / MPU CORS failure

## Layer 1 — High-level

Manuscript uploads on Vercel no longer force multipart (MPU) mode, which was causing 400 errors on `vercel.com/api/blob/mpu` and misleading CORS errors in the browser. The upload-token route is exempt from global session middleware so Vercel Blob callbacks can reach it; token generation still requires a logged-in user inside the handler. Blob misconfiguration now returns a readable 503 instead of a generic 500.

## Layer 2 — Low-level

- **`app/composables/useManuscriptUpload.ts`** — removed `multipart: true` from `upload()`. Before: always used MPU flow. Now: single-object client PUT (sufficient up to `MAX_FILE_SIZE_MB`; still bypasses serverless body limit). Why: MPU fails from custom domains with 400 + no CORS headers on error responses.
- **`server/middleware/auth.ts`** — exempt `POST /api/files/upload-token` from session gate. Before: all non-public API routes required session. Now: route handles auth internally. Why: Blob `upload-completed` webhooks have no user cookie.
- **`server/api/files/upload-token.post.ts`** — added `BLOB_READ_WRITE_TOKEN` guard (503), removed no-op `onUploadCompleted`, wrapped `handleUpload` to map `BlobError` → 503 with SDK message. Before: unhandled errors → 500; callback URL embedded in every token. Now: clearer errors; no callback registration.

## Verification

- `pnpm typecheck` — pass.

## Untested paths

- Live upload on `japr.vercel.app` after redeploy (requires operator deploy).
