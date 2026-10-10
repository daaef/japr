# Problem: desk_editor can't receive submissions or back up reviewer assignment

## Symptoms (from 2026-10-09 stakeholder meeting)

1. **"Desk editor receives all submissions to ensure nothing falls through cracks."** Today
   `desk_editor` is not notified on new submissions — only `EDITOR_ROLES`
   (`admin`, `editor_in_chief`, `managing_editor`, `copy_desk_editor`) are
   (`server/api/journals/index.post.ts:72-129`).
2. **"Managing editor assigns reviewers; desk editor can do same as backup."** `desk_editor`
   does not hold the `assign-reviewers` permission today (`shared/constants/permissions.ts:118-128`
   lists `manage-review-process`, `coordinate-reviews`, `review-manuscript`, `provide-feedback`,
   `read-public-journals` — no `assign-reviewers`), and even with the permission, `desk_editor`
   cannot reach the page the action lives on (see root causes).

## Important correction before this is read as a simple permission grant

An earlier assumption in this review conflated `desk_editor` with `copy_desk_editor` because
several meeting bullets used "desk editor" for responsibilities that, in code, belong to
`copy_desk_editor` (promoted to a full editor-tier "deputy admin" role on 2026-10-04 —
see `docs/tasks/20261004_promote-copy-desk-collapse-desk-review/`). They are **not** the same
role. `desk_editor` is a distinct, currently-used reviewer-tier role:

- Listed in `reviewerRoleKeys` alongside `associate_editor` and `external_reviewer`
  (`shared/constants/roles.ts:15`).
- Routed to the reviewer workspace/layout, not the editor one (`app/utils/workspace.ts:12,32`).
- Referenced in auth/onboarding middleware (`app/middleware/auth.ts:15`,
  `app/middleware/author-onboarding.ts:9`), nav visibility
  (`app/components/journal/JournalNavbar.vue:127,259`), ping targeting
  (`shared/constants/pingTemplates.ts:39`), regional assignment
  (`server/api/editor/journals/[uuid]/regional-assignment.get.ts:19`), and dashboard stats
  (`server/utils/dashboardSummary.ts:229`, `server/api/stats.get.ts:15`).
- Currently held by a named person (Dr. Ellen Whitworth per the meeting), who the meeting notes
  say may move to **admin** — not to `copy_desk_editor`.

This task is scoped to **promoting `desk_editor` on its own terms** (new capabilities, same
role), not merging it into `copy_desk_editor`.

## Root causes

1. **Submission notification is role-list-based, not permission-based.**
   `server/api/journals/index.post.ts:75` builds the "new submission" notification recipient
   list from `EDITOR_ROLES` directly. `desk_editor` is not in that list and isn't meant to be
   (it would also pull in approve/decline/publish UI access desk_editor doesn't need — see below).

2. **`assign-reviewers` is gated two ways, and `desk_editor` fails both today:**
   - **API permission**: `server/api/editor/journals/[uuid]/assign-reviewers.post.ts:19` calls
     `requirePermission(event, 'reviewer', 'assign')` — `desk_editor` doesn't hold this
     permission (`permissions.ts:118-128`).
   - **Page access**: the assign-reviewers UI lives on `app/pages/editor/journals/[uuid].vue`,
     gated by `definePageMeta({ requiredRoles: EDITOR_ROLES })` (line 30) — a hardcoded role
     check, not a permission check. Every other editor page
     (`submissions.vue`, `in-progress.vue`, `approved.vue`, `declined.vue`, `published.vue`,
     `copy-desk.vue`, `settings.vue`, etc.) uses the identical `requiredRoles: EDITOR_ROLES`
     gate, and the queue API endpoints behind them (`pending.get.ts`, `in-progress.get.ts`)
     call `requireEditor(event)`, also role-based. There is currently no per-page or
     per-permission granularity in the editor area — a role is either in `EDITOR_ROLES` and
     gets the whole section, or it isn't and gets none of it.

3. **The one existing "notify everyone who can assign reviewers" path is already
   permission-driven, which is actually good news:** `notifyAssignersOfReviewStart()`
   (`server/utils/editorNotifications.ts:69-96`, called from `index.post.ts:134` on every new
   submission) calls `getUsersWithPermission('reviewer', 'assign')` — not a hardcoded role list.
   **Granting `desk_editor` the `assign-reviewers` permission alone would make it start
   receiving this specific notification automatically**, with no code change needed in that
   function. This only covers the "ready for reviewer assignment" notice, not the separate
   "new manuscript submitted" notice gated by `EDITOR_ROLES` in root cause 1.

## Scope

- Give `desk_editor` the `assign-reviewers` permission.
- Give `desk_editor` enough page/endpoint access to actually use it (see plan.md for the two
  ways to do this and their trade-offs).
- Decide whether "receives all submissions" means the existing `EDITOR_ROLES`-gated
  "new manuscript submitted" notice, the permission-driven "ready for reviewer assignment"
  notice (which `desk_editor` gets for free once promoted), or both.
- Explicitly **not** in scope: approve, decline, publish, or any other editor-tier action for
  `desk_editor` — the meeting only asked for submission visibility and backup reviewer
  assignment.
