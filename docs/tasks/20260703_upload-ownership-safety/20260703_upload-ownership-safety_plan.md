# Plan — Upload ownership binding & storage safety

## Steps

1. **Add a `files` table**: `id, storageKey, ownerId, journalId (nullable until attached), status ('pending'|'attached'), createdAt, expiresAt`. Complexity: medium (new migration). AC: a row is created at token-mint time, before the browser ever talks to Blob.
2. **`upload-token.post.ts`**: after minting the token, write the `files` row with `ownerId = session.user.id`, `status = 'pending'`. Complexity: low.
3. **`journals/index.post.ts` / `revision.post.ts`**: before saving `journalUrl`, look up the `files` row by `storageKey`, verify `ownerId === session.user.id` and `status === 'pending'`, then mark it `attached` and link `journalId`. Reject with 403 if the row doesn't exist or doesn't belong to the caller. Complexity: medium. AC: a `journalUrl` value the caller never had a token for is rejected.
4. **Fix `resolveStoredFilePath` in `server/utils/files.ts`** to resolve the path and verify it stays within `getUploadDir()` (`path.resolve` + a `startsWith` check on the resolved absolute path), rejecting anything that escapes. Complexity: low. AC: a `storageKey` containing `..` segments is rejected before any filesystem read.
5. **Add a scheduled cleanup pass** — ships in this phase as a single manually/cron-triggered endpoint (see the operational-hardening phase for the general job runner it eventually moves behind): delete any `files` row with `status = 'pending'` older than 24h, and the corresponding Blob object. Complexity: medium. AC: a manually-inserted stale `pending` row and its blob are both gone after the job runs.
6. **Extend `server/middleware/rate-limit.ts` to cover `/api/files/upload-token`**. Complexity: trivial (reuses the fixed limiter from the auth-identity-hardening phase, if it has landed; otherwise apply directly here).

## Untested paths

Live Blob deletion in production — local dev can exercise the local-driver deletion path fully, but the Blob `del()` call itself needs a real connected store to verify end-to-end.

## Regression checklist

- Legitimate upload → attach → download flow, both drivers, unchanged from a user's perspective.
- `journalUrl` pointing at a file the caller didn't upload → rejected.
- `journalUrl` containing `../` on the local driver → rejected before any file read.
- A stale unattached upload → removed by the cleanup job after the age threshold; a fresh one → left alone.
- Repeated upload-token requests past the rate limit → 429.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified (ownership check applied identically on create and revision endpoints)
