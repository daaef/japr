# Changelog: reviewer manuscript-content change locations

## What changed

- The reviewer **"Request manuscript changes"** form now supports corrections inside the uploaded manuscript file, not just title/abstract/description.
- Added structured fields: **Page**, **Line**, **Original excerpt**, and **Suggested correction**.
- The reviewer page now lists the reviewer's own pending change requests so they can see what they have already submitted.
- The author **"Requested changes"** section renders manuscript-content corrections with page/line/original excerpt and a hint to upload a revised file under **"Submit a revision"**.

## Files changed

- `server/api/reviewer/journals/request-change.post.ts`
  - Extended `changeSchema` with `manuscript_content` field option and `page`, `line`, `originalExcerpt` fields.
  - Stores new fields in `changeRequests` JSONB entries.
- `app/pages/reviewer/journals/[uuid]/review.vue`
  - Added "Manuscript content" option to the Field dropdown.
  - Added conditional Page/Line/Original excerpt inputs.
  - Added a read-only list of the reviewer's own pending change requests.
- `app/pages/author/submissions/[id].vue`
  - Renders `manuscript_content` requests with page/line/original excerpt.
  - Hides the text input for document-level corrections and explains they should be resolved via the revision upload.

## Out of scope

- Reviewer edit/delete of submitted change requests still requires new API routes and is not implemented here.
- The author revision upload flow itself was not changed; it already supports uploading a corrected manuscript file.
