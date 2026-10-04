# Changelog: review flow seamlessness fixes

## What changed

1. **Reviewer change-request form is gated to active reviewers**
   - The **Request manuscript changes** card is now hidden until the reviewer has accepted the invitation and has status `in-progress`.
   - The success message no longer claims the author was notified; it now says the request has been recorded for editors.

2. **Editor can request revisions when consensus suggests revision**
   - The **Request revisions** action is now also available when the manuscript is `ready_for_managing_editor_notice`, so the editor can ask for revisions when the quorum has been met and reviewers recommended changes.

3. **Change request lists are scoped to the current review round**
   - `request-change.post.ts` now records `round_number` on every change request entry.
   - The reviewer's own change request list and the editor's reviewer change request card both filter out entries from prior rounds, preventing stale requests from appearing after the author uploads a revision.

4. **Author update button hidden when there are no field-level requests**
   - The **Submit change updates** button only appears when at least one pending change request targets `title`, `abstract`, or `description`. Document-level (`manuscript_content`) requests still display, but the button is omitted because those corrections are handled via the revision upload.

## Files changed

- `server/api/reviewer/journals/request-change.post.ts`
- `app/pages/reviewer/journals/[uuid]/review.vue`
- `app/pages/editor/journals/[uuid].vue`
- `app/pages/author/submissions/[id].vue`

## Not fixed in this pass

- Author change request updates still key by field name, so if two reviewers requested different changes to the same field, a single update resolves both entries. This requires stable per-request IDs and is left for a future refinement.
