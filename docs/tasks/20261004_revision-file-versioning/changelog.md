# Changelog: snapshot manuscript file per version

## What changed

### Database

- Added `journal_url` column to `manuscript_versions` via migration `0017_version_file_urls.sql`.
  - Existing rows are backfilled with the journal’s current `journal_url` so they remain previewable.
- Added `manuscript_versions.journal_url` to `server/db/check.ts` so boot/CI validates the column.

### Backend

- `server/api/author/submissions/[id]/revision.post.ts` now records the active file URL on the new version row:
  - the newly uploaded file if one was provided,
  - otherwise the journal’s current `journalUrl`.
- `server/api/journals/index.post.ts` records the initial `journalUrl` on the version 1.0 row.
- `server/services/versions.ts` `revertToVersion` copies the source version’s `journalUrl` into the new revert version and updates the journal’s current `journalUrl`.
- `server/api/journals/[id]/versions/[versionId].get.ts` returns `journalUrl` in the version payload.
- Added version-scoped preview endpoints:
  - `GET /api/doc-preview/:journalId/versions/:versionId`
  - `GET /api/doc-preview/:journalId/versions/:versionId/file`
- Added version-scoped download endpoint:
  - `GET /api/journals/:id/versions/:versionId/download`

All new endpoints enforce the same authorization as the existing journal preview/download routes: owner, editor/admin, or assigned reviewer.

### Frontend

- `app/composables/useManuscriptPreview.ts` accepts an optional `versionId` and fetches the version-scoped preview endpoint when provided.
- `app/components/DocumentPreview.vue` accepts an optional `versionId` prop and passes it through.
- `app/pages/journals/[slug]/versions/[versionId].vue` now shows:
  - a **Preview manuscript file** button that opens the document preview modal for that version,
  - a **Download this version** button that fetches the version-scoped download endpoint.

## Out of scope

- The main journal preview/download routes still use the current `journalUrl`.
- No new unit tests were added because the changed behavior is tied to DB state and file storage; existing pure version-numbering tests remain unchanged.

## Deployment note

Run `pnpm db:migrate` (or the project’s migration command) to apply `0017_version_file_urls.sql` before deploying this change.
