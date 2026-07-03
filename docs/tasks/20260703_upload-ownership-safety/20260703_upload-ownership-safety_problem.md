# Problem — Uploaded files are trusted client input, not owned records

## Root cause

The direct-to-Blob upload flow mints a token and later trusts whatever `pathname` the browser POSTs back as `journalUrl`, with no server-side record binding that path to the uploading user or the target manuscript (`app/composables/useManuscriptUpload.ts`, `server/api/files/upload-token.post.ts`). Access control on download is "does the requester own this journal row," not "was this file actually issued to them," so nothing stops a client from attaching an arbitrary storage key it learned or guessed.

Separately, on the `local` storage driver, `server/utils/files.ts:54-56` builds the on-disk path with `join(getUploadDir(), storageKey.replace(/^\/+/, ''))`, which does not strip `..` segments — combined with the lack of ownership binding, a `journalUrl` containing a traversal sequence can make the server read an arbitrary file.

There is also no cleanup job: no `del()` call exists anywhere in the codebase, so any upload that never gets attached to a saved journal (abandoned form, failed validation, crash) persists in Blob storage forever, and no rate limit exists on upload-token issuance.

## Symptoms

- A file's storage key is trusted input with no ownership check.
- Local-driver deployments have a path-traversal arbitrary-file-read primitive.
- Orphaned blobs accumulate with no cleanup.
- Any authenticated user can mint unlimited upload tokens.

## Affected files / functions

- `server/api/files/upload-token.post.ts`
- `app/composables/useManuscriptUpload.ts`
- `server/utils/files.ts` (`resolveStoredFilePath`)
- `server/api/journals/index.post.ts` and `server/api/author/submissions/[id]/revision.post.ts` (where `journalUrl` is accepted)
- `server/api/journals/[id]/download.get.ts`

## Blast radius

Every manuscript file upload and download, on both storage drivers. (The path-traversal fix is local-driver-only; ownership binding and cleanup apply to both drivers.)

## Constraints

- Must not change the existing, already-correct storage-driver abstraction (local vs. Blob) or the DOC→PDF conversion gating.
- Must keep working within Vercel's direct-to-Blob mechanism — no reintroducing a server-proxied re-upload that hits the serverless body-size limit.

## Edge cases

- A legitimate in-progress draft that a user abandons and returns to hours later shouldn't have its file swept if it's still within a reasonable grace window — the cleanup job's age threshold needs to be longer than any realistic single-session gap (e.g. 24h, not 1h).
