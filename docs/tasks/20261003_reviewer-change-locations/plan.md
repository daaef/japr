# Plan: reviewer manuscript-content change locations

## Problem

Reviewers (including associate editors acting as reviewers) can request changes through the **"Request manuscript changes"** form, but they can only target three top-level fields: `title`, `abstract`, and `description`. There is no way to point to a specific location inside the uploaded manuscript file, and after submitting a request the reviewer sees no list of their own requests on the page. The author page renders requested changes as editable fields only for title/abstract/description; document-level corrections have no structured representation.

## Scope

1. Extend the reviewer **"Request manuscript changes"** form to support document-level corrections with page, line, original excerpt, and suggested correction.
2. Store these as structured entries in the existing `journals.changeRequests` JSONB array — no new API endpoints.
3. Show the reviewer their own submitted change requests on the review page (read-only, since edit/delete needs new routes).
4. Render document-level change requests on the author submission page as read-only guidance, keeping title/abstract/description requests editable as before.
5. Add a hint on the author page linking requested changes to the existing **"Submit a revision"** file upload form.

## Files to change

- `server/api/reviewer/journals/request-change.post.ts` — extend `changeSchema`, validate and store page/line/original excerpt/suggested correction.
- `app/pages/reviewer/journals/[uuid]/review.vue` — add form fields, add "Manuscript content" option, display own submitted change requests.
- `app/pages/author/submissions/[id].vue` — render `manuscript_content` requests with location data, add revision-upload hint.

## Out of scope

- Reviewer edit/delete of submitted change requests (requires new API routes).
- Any change to the author revision upload flow, which already supports uploading a corrected document.
