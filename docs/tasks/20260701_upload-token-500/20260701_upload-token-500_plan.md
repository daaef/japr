# Plan — Upload-token 500 on Vercel

## Steps

1. **Exempt upload-token from auth middleware** — `server/middleware/auth.ts`. Complexity: trivial. AC: unauthenticated `blob.upload-completed` POST reaches the handler (signature check still applies).
2. **Harden upload-token handler** — `server/api/files/upload-token.post.ts`: early `BLOB_READ_WRITE_TOKEN` guard, remove `onUploadCompleted`, catch `BlobError` → `createError(503, message)`. Complexity: low. AC: missing token returns 503 with readable message, not generic 500.
3. **Verify locally** — run typecheck/eslint on touched files. Complexity: trivial. AC: `pnpm typecheck` passes.
4. **Changelog + README note** — same task folder; optional one-line in README under Vercel uploads if not already clear. Complexity: trivial.

## Untested paths

- Live Vercel Blob token issuance (requires connected store on deploy).

## Regression checklist

- `POST /api/files/upload-token` with valid session + Blob token → returns `clientToken`
- `POST /api/files/upload` (local path) unchanged
- Other `/api/*` routes still require session via middleware

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Vercel env checklist communicated to operator
