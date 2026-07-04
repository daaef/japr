# Changelog — Upload ownership binding & storage safety

## Layer 1 — High-level

A file's storage key is no longer trusted client input. A new `files` table records who a storage key was actually issued to at upload time (both the Blob direct-upload flow and the local multipart flow), and `journals/index.post.ts`/`revision.post.ts` now verify that record before ever saving a `journalUrl` — a key the caller never uploaded, or already used on another manuscript, is rejected with 403. On the local storage driver, a `storageKey` containing `../` segments can no longer escape the upload directory to read an arbitrary file. Orphaned uploads (token issued, never attached — abandoned form, failed validation, crash) are now cleanable via an admin-triggered endpoint that also deletes the underlying storage object, not just the DB row. Upload-token issuance is now rate-limited.

## Layer 2 — Low-level

- **`server/db/schema/files.ts`** (new), migration `0010_majestic_garia.sql` — `files` table: `id, storageKey (unique), ownerId, journalId (nullable), status ('pending'|'attached'), createdAt, expiresAt`.
- **`server/utils/fileOwnership.ts`** (new) — `recordUploadedFile` (called at upload time), `verifyPendingUpload` (throws 403 if the key wasn't issued to this caller or isn't still pending), `markFileAttached` (links the journal id once it exists). Split into verify/mark-attached rather than one combined function specifically for the create-journal flow, which doesn't have a `journalId` until after the insert — verify before the insert so a rejected key never gets saved, mark-attached after.
- **`server/api/files/upload-token.post.ts`** — `onBeforeGenerateToken` now records the pathname/owner before returning the token, using the `pathname` argument `handleUpload` already passes in (previously discarded).
- **`server/api/files/upload.post.ts`** (local driver) — also records ownership immediately after `persistUpload`, so the same ownership check works identically regardless of storage driver, not just the direct-to-Blob path the plan named. Without this, every local-dev submission would 403 at attach time since no `files` row would ever exist for local uploads.
- **`server/api/journals/index.post.ts`**, **`server/api/author/submissions/[id]/revision.post.ts`** — call `verifyPendingUpload` before saving `journalUrl`, `markFileAttached` after the journal id is known. Identical pattern in both endpoints.
- **`server/utils/files.ts`** (`resolveStoredFilePath`) — now resolves to an absolute path and rejects (400) anything whose path relative to the upload directory starts with `..` or is itself absolute, closing the path-traversal read primitive. Also added `deleteStoredFile` (local `unlink` / Blob `del`, missing files not an error) for the cleanup job.
- **`server/api/admin/files/cleanup.post.ts`** (new) — admin-only; deletes `files` rows still `pending` past their `expiresAt`, and their storage objects, deleting from the DB by the exact id set already cleaned up (not by re-evaluating the time condition a second time, which could otherwise delete a DB row whose storage object was never actually removed).
- **`server/middleware/rate-limit.ts`** — added `/api/files/upload-token` (10/min per IP). Noted in-line that Vercel's upload-completed webhook shares this route but arrives from Vercel's own infra IP, so it naturally falls into a separate bucket from the uploading user's.
- **`server/db/check.ts`** — added `files.storage_key` to the required-objects list.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (35/35) — all pass.
- `resolveStoredFilePath`'s traversal guard calls the Nitro-only `createError` global, which isn't available under plain `tsx --test` (confirmed empirically — same constraint as `assertManuscriptStatus`/`assertReviewerStatus` in this codebase, which are also not directly unit-tested for the same reason). Verified instead by direct invocation under `tsx` for the normal-path case, and live against the running dev server for the throw path (below).
- Live against `nuxt dev` + the docker-compose Postgres:
  - Local-driver upload → `files` row created with `status: 'pending'`, correct `ownerId`, `expiresAt` ~24h out.
  - Submitting a journal with that storageKey → 200, journal created, `files` row flips to `attached` with the new `journalId`.
  - Reusing the same now-attached key on a second submission → 403.
  - A completely fabricated/never-issued storageKey → 403.
  - A different real user (fresh registered author) attempting to claim the first author's uploaded key → 403, distinct from (and only reached after passing) the interests gate from the auth-identity-hardening phase.
  - Path traversal: manually set a journal's `journalUrl` to a `../../../etc/passwd`-style payload, then downloaded as the legitimate owner → 400 "Invalid file path," not a leak or crash. Restored the real URL afterward and confirmed the legitimate download still worked and matched the original upload byte-for-byte.
  - Cleanup job: inserted one stale `pending` row (expired, with a real on-disk file) and one fresh `pending` row, ran `/api/admin/files/cleanup` as admin — stale row and its on-disk file both gone; fresh row untouched; attached row untouched.
  - All test users, journals, and files created during verification were deleted afterward.

## Untested paths

Per the plan: live Blob `del()` deletion in production — this dev environment runs the local storage driver, so `deleteStoredFile`'s Blob branch was verified by code review and against the Blob SDK's type signature, not exercised against a real connected store.
