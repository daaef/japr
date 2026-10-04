# Plan: review flow seamlessness fixes

## Goal

Close the friction points identified in the review-changes audit so every button appears at the right time, stale data is hidden, and actions match the workflow state.

## Fixes

1. **Reviewer change-request form gated to active reviewers**
   - Hide the **Request manuscript changes** card unless the reviewer's status is `in-progress`.
   - Correct the success message so it does not claim the author was notified.

2. **Editor can request revisions when consensus suggests revision**
   - Show the **Request revisions** action when the manuscript is `ready_for_managing_editor_notice`, not only when it is `reviewed`.

3. **Round-scoped change request lists**
   - Add `currentReviewRound` to the reviewer and editor journal payloads.
   - Filter the reviewer's own change request list and the editor's reviewer change request card to the current round so stale entries from a prior round do not appear.

4. **Author update button hidden when there are no field-level requests**
   - Only show **Submit change updates** when at least one pending request targets `title`, `abstract`, or `description`.

## Files to change

- `app/pages/reviewer/journals/[uuid]/review.vue`
- `app/pages/editor/journals/[uuid].vue`
- `app/pages/author/submissions/[id].vue`
