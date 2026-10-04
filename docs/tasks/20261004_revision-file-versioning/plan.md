# Plan: snapshot manuscript file per version

## Problem

When an author submits a revision, the new version card in the version history shows the updated title/abstract/changes summary, but clicking the version shows either the original text content or no file preview at all. The actual manuscript file for each version is not stored in the version snapshot, so historical versions cannot display or download their own file.

## Root cause

The `manuscript_versions` table stores only text metadata (`title`, `abstract`, `content`) and does not store the file URL that belonged to that version. Every preview and download endpoint reads from the single `journals.journal_url` field, which always points to the most recent file. As a result:

- A version created without a new file upload keeps pointing at the original file.
- A version created with a new file upload cannot later be distinguished from the current file because the snapshot is not recorded.
- The version detail page (`journals/[slug]/versions/[versionId]`) only renders text fields and has no file preview.

## Goal

Store the file URL on every `manuscript_versions` row so that each version can be previewed and downloaded independently of the current journal file.

## Files to change

### Database

- `server/db/schema/manuscriptVersions.ts`
  - Add `journalUrl: text('journal_url')` column.
- `server/db/migrations/0017_version_file_urls.sql`
  - Add the column with a backfill: existing rows inherit the current `journals.journal_url` for their journal.
- `server/db/check.ts`
  - Add `manuscript_versions.journal_url` to `REQUIRED_COLUMNS`.

### Backend

- `server/api/author/submissions/[id]/revision.post.ts`
  - When inserting a new version, capture the file URL: use the newly uploaded file if present, otherwise the journal’s current `journalUrl`.
- `server/api/journals/[id]/versions/[versionId].get.ts`
  - Include `journalUrl` in the returned version.
- `server/api/doc-preview/[uuid]/versions/[versionId].get.ts` (new)
  - Author/editor/assigned-reviewer access only.
  - Loads the version row, verifies it belongs to the journal, and previews the version’s `journalUrl`.
- `server/api/doc-preview/[uuid]/versions/[versionId]/file.get.ts` (new)
  - Streams the version’s file.
- `server/api/journals/[id]/versions/[versionId]/download.get.ts` (new)
  - Downloads the version’s file with a sensible filename.

### Frontend

- `app/composables/useManuscriptPreview.ts`
  - Accept an optional `versionId` and fetch the version-scoped preview endpoint when provided.
- `app/components/DocumentPreview.vue`
  - Accept an optional `versionId` prop and pass it through.
- `app/pages/journals/[slug]/versions/[versionId].vue`
  - Add a “Preview manuscript file” button that opens `DocumentPreview` for this version.
  - Add a “Download this version” button linking to the new download endpoint.

### Tests

- Add/update unit tests where the logic can be exercised without a database.
- Add e2e coverage in the revision-cycle spec to assert that version 1.1 can be previewed/downloaded independently.

## Out of scope

- Changing how `journals.title`, `journals.abstract`, or `journals.description` are updated (or not updated) on revision.
- Modifying the main journal preview/download routes; they continue to use the current `journalUrl`.
