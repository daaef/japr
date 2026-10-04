# Plan: Promote copy desk editor + collapse desk review

## Overview

Two changes that land together because the second (collapsing desk review) depends on copy desk
editors being part of the editorial notification audience created by the first.

---

## Part A — Promote copy desk editor to full editorial role

### A1. Add `copy_desk_editor` to `editorRoleKeys`

**File:** `shared/constants/roles.ts`

```ts
// Before
export const editorRoleKeys = ['admin', 'editor_in_chief', 'managing_editor'] as const

// After
export const editorRoleKeys = ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor'] as const
```

This single change cascades automatically to:
- `EDITOR_ROLES` (line 21 — it's just `editorRoleKeys`)
- `EDITOR_ROLES_WITH_COPY_DESK` (line 22 — it spreads `editorRoleKeys` + `copy_desk_editor`,
  which will now be a no-op duplicate; keep it for backward compat or collapse it — see A2)
- `hasEditorRole()` (line 25)
- `requireEditor()` in `server/utils/permissions.ts:137-138`
- Every notification fan-out in `editorNotifications.ts` (all use `EDITOR_ROLES`)
- The submission notification in `journals/index.post.ts:134`
- All 8 editor queue endpoints that use `requireEditor`
- All frontend page guards that use `EDITOR_ROLES`

### A2. Collapse `EDITOR_ROLES_WITH_COPY_DESK`

With `copy_desk_editor` in `editorRoleKeys`, `EDITOR_ROLES_WITH_COPY_DESK` is identical to
`EDITOR_ROLES`. Options:

- **Option A (minimal):** Leave it as-is — it becomes a redundant alias. No breakage.
- **Option B (clean):** Replace every import of `EDITOR_ROLES_WITH_COPY_DESK` with
  `EDITOR_ROLES` and delete the constant. Touch ~12 files.

Recommend **Option A** for this task (keep it as a no-op alias), then clean it up in the
configurable-permissions task when those files are already being touched.

### A3. Remove `copy_desk_editor` from `reviewerRoleKeys` — NOT NEEDED

`copy_desk_editor` is not in `reviewerRoleKeys` today (only `desk_editor` is). No change needed.

### A4. Grant editorial permissions to `copy_desk_editor` in seed data

**File:** `shared/constants/permissions.ts`, the `copy_desk_editor` entry in `systemRoles`

```ts
// Before
{
  name: 'copy_desk_editor',
  description: 'Final editing',
  isSystem: true,
  permissions: [
    'copy-edit-manuscript',
    'final-edit-manuscript',
    'prepare-for-publication',
    'read-public-journals'
  ]
}

// After — union of EIC + managing editor + existing copy desk permissions
{
  name: 'copy_desk_editor',
  description: 'Deputy editor — full editorial workflow plus copy desk production',
  isSystem: true,
  permissions: [
    // From EIC
    'final-approve-manuscript',
    'final-reject-manuscript',
    'publish-manuscript',
    // From managing editor
    'assign-reviewers',
    'send-approval-notice',
    'send-decline-notice',
    // Shared EIC + ME
    'request-revisions',
    // Original copy desk
    'copy-edit-manuscript',
    'final-edit-manuscript',
    'prepare-for-publication',
    'read-public-journals'
  ]
}
```

**Important:** Seeds are additive-only — running `pnpm db:seed` on an existing DB adds the new
grants but never removes old ones. This is fine here since we're only adding permissions.

### A5. Update `isEditorialProfileRole` — NO CHANGE NEEDED

`server/utils/permissions.ts:125-127` currently returns `true` for `copy_desk_editor` via the
explicit `|| roleName === 'copy_desk_editor'` branch. After A1, `isEditorRole` will also return
`true` for it, making the `||` redundant but not harmful. Leave as-is.

### A6. Update `resolveRoleLayout` / `resolveWorkspacePath` — DECISION NEEDED

Currently `copy_desk_editor` routes to the `copy-desk` layout and `/editor/copy-desk` home.
After promotion they should use the full `editor` layout and `/editor` home, since they now
have access to all editor pages.

**File:** `app/utils/workspace.ts`

- Remove the `copy_desk_editor` special case from `resolveRoleLayout` (falls through to the
  editor branch that checks `editorRoleKeys`).
- Remove the `copy_desk_editor` special case from `resolveWorkspacePath` (same reasoning).
- The `copy-desk` layout file (`app/layouts/copy-desk.vue`) and the copy-desk redirect
  middleware (`app/middleware/copy-desk-redirect.ts`) become dead code. Keep them for now,
  remove in a follow-up cleanup.

### A7. Update `JournalNavbar.vue`

Lines 127-132 show a "Copy Desk" nav link gated by `hasRole('copy_desk_editor')`. After
promotion this should show the standard "Editor" link instead. Simplest: remove the
copy-desk-specific block and let the editor block (which checks `hasEditorRole`) cover it.

### A8. Update `app/middleware/role.ts` copy-desk redirect

Line 22-27 redirects copy-desk-only users from unauthorized editor pages to `/editor/copy-desk`.
After promotion they have access to all editor pages, so this branch is dead. Remove or leave
as harmless dead code.

---

## Part B — Collapse desk review into in_progress

### B1. Change initial submission status

**File:** `server/api/journals/index.post.ts`

```ts
// Before (line 93)
approvalStatus: MANUSCRIPT_STATUS.DESK_REVIEW,

// After
approvalStatus: MANUSCRIPT_STATUS.IN_PROGRESS,
```

Also update the audit log metadata (line 191):
```ts
metadata: { status: MANUSCRIPT_STATUS.IN_PROGRESS }
```

### B2. Update the DB column default

**File:** `server/db/schema/journals.ts:52`

```ts
// Before
approvalStatus: approvalStatusEnum('approval_status').notNull().default('desk_review'),

// After
approvalStatus: approvalStatusEnum('approval_status').notNull().default('in-progress'),
```

**Migration:** A new migration (0018) that runs:
```sql
ALTER TABLE "journals" ALTER COLUMN "approval_status" SET DEFAULT 'in-progress';
```

The `desk_review` enum value stays in the DB (removing a pg enum value is destructive and
unnecessary — old rows may still have it). The value just stops being used for new submissions.

### B3. Migrate existing `desk_review` rows

The migration should also move any manuscripts currently stuck in `desk_review` to `in_progress`:
```sql
UPDATE "journals" SET "approval_status" = 'in-progress'
WHERE "approval_status" = 'desk_review';
```

### B4. Remove the `send-to-review` endpoint

**Delete file:** `server/api/editor/journals/[uuid]/send-to-review.post.ts`

Since new manuscripts start at `in_progress`, there is no `desk_review -> in_progress`
transition to perform. The `notifyAssignersOfReviewStart` call that lived here needs to move —
see B7.

### B5. Remove the `desk-decline` endpoint

**Delete file:** `server/api/editor/journals/[uuid]/desk-decline.post.ts`

No desk reject is needed per the developer's confirmation.

### B6. Update status transitions

**File:** `shared/constants/manuscriptStatus.ts`

- Remove or empty the `DESK_REVIEW` transition entry:
  ```ts
  [MANUSCRIPT_STATUS.DESK_REVIEW]: [],  // legacy — no longer used for new submissions
  ```
- Remove `MANUSCRIPT_STATUS.DESK_REVIEW` from the `PENDING` transition (if it was a target).
  Currently `PENDING` can go to `[IN_PROGRESS, DECLINED]` — no change needed.

### B7. Move "ready for reviewer assignment" notification into the submission handler

Currently `notifyAssignersOfReviewStart` fires when "send to review" is clicked. With desk
review gone, this notification should fire at submission time — the manuscript is immediately
ready for reviewer assignment.

**File:** `server/api/journals/index.post.ts` — after the existing editor notification block
(~line 181), add:

```ts
// Notify users who can assign reviewers (managing editors) that the manuscript is ready
try {
  await notifyAssignersOfReviewStart(journal.id)
} catch (error) {
  console.error('Failed to notify assigners:', error)
}
```

Import `notifyAssignersOfReviewStart` from `#server/utils/editorNotifications`.

### B8. Update the editor UI — remove desk review action card

**File:** `app/pages/editor/journals/[uuid].vue`

- Remove `canSendToReview` computed (line 43) and `canDeskDecline` computed (line 44) — or
  repurpose `canDeskDecline` since the regular decline button still exists in the reviewed-
  actions section and reuses `can('journal', 'reject')`.
- Remove the `showDeskReviewActions` computed (line 271).
- Remove the `sendToReview()` function (lines 318-323).
- Remove the `deskDecline()` function (lines 325-333).
- Remove the entire desk review action card in the template (lines 614-649).
- Remove the `desk_review` entry from `EDITOR_STATUS_LABELS` (line 7).
- Update `canEditManuscript` to remove `canSendToReview` and `canDeskDecline` from the
  disjunction (lines 51-53). The remaining permissions (`canAssignReviewers`,
  `canApproveForPublication`, etc.) are sufficient.
- In `hasVisibleEditorialAction` (line 291), remove `showDeskReviewActions.value`.

### B9. Update dashboard summary

**File:** `server/utils/dashboardSummary.ts`

- `deskReview` (line 92) will always be 0 after the data migration. Keep it for backward compat
  or remove it — removing requires updating the `EditorDashboardSummary` type and any UI that
  reads `deskReview`. Recommend keeping it (it just returns 0).
- `pendingQueue` (line 94) will equal just `legacyPending` since `deskReview` is 0. Harmless.

### B10. Update the pending queue endpoint

**File:** `server/api/editor/journals/pending.get.ts:10`

```ts
// Before
listJournalsByStatus(query, [MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.PENDING])

// After
listJournalsByStatus(query, [MANUSCRIPT_STATUS.PENDING])
```

`DESK_REVIEW` can stay in the array (returns 0 results) or be removed for clarity. Recommend
removing.

### B11. Update `authorEditableStatuses`

**File:** `server/api/journals/[id].patch.ts:41-42`

```ts
// Before
const authorEditableStatuses = [MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.PENDING]

// After
const authorEditableStatuses = [MANUSCRIPT_STATUS.PENDING]
```

Authors can still edit during `PENDING` (the status a revision re-enters). Manuscripts now start
at `IN_PROGRESS`, which is intentionally NOT author-editable (it means editorial review has
begun).

### B12. Update labels and colors — keep `desk_review` entries

`MANUSCRIPT_STATUS_LABELS`, `MANUSCRIPT_STATUS_COLORS`, `JournalStatusBadge.vue`,
`EditorStatusReference.vue` all have `desk_review` entries. These should stay for backward
compatibility (old manuscripts that were desk-reviewed before this change will still display
correctly). They're harmless dead paths for new submissions.

### B13. Update the author journey funnel

**File:** `app/pages/author/index.vue:59`

The journey funnel currently counts manuscripts past `desk_review` as having cleared the "Desk
Review" stage. After this change, rename the stage to "Editorial Review" and count manuscripts
past `in_progress` instead, or remove the stage entirely since it's now meaningless.

### B14. Update tests

- `tests/manuscriptStatus.test.ts` — update the `DESK_REVIEW -> IN_PROGRESS` transition test
  (the transition is now empty or removed).
- `tests/editorGuards.test.ts` — update `authorEditableStatuses` assertion to exclude
  `DESK_REVIEW`.
- `tests/dashboardSummary.test.ts` — update any fixtures that use `DESK_REVIEW` status.
- Remove any test that asserts the send-to-review or desk-decline flow.

### B15. Documentation

- Update `docs/manuscript-review-lifecycle.md` to reflect the new flow.
- Update `docs/SYSTEM_FLOWS.md` to remove desk review references.

---

## File change summary

| Action | File |
|--------|------|
| Edit | `shared/constants/roles.ts` — add `copy_desk_editor` to `editorRoleKeys` |
| Edit | `shared/constants/permissions.ts` — expand `copy_desk_editor` permissions |
| Edit | `shared/constants/manuscriptStatus.ts` — empty `DESK_REVIEW` transitions |
| Edit | `server/db/schema/journals.ts` — change column default |
| **New** | `server/db/migrations/0018_collapse_desk_review.sql` |
| Edit | `server/api/journals/index.post.ts` — initial status + add assigner notification |
| Edit | `server/api/journals/[id].patch.ts` — remove `DESK_REVIEW` from editable list |
| Edit | `server/api/editor/journals/pending.get.ts` — remove `DESK_REVIEW` from filter |
| **Delete** | `server/api/editor/journals/[uuid]/send-to-review.post.ts` |
| **Delete** | `server/api/editor/journals/[uuid]/desk-decline.post.ts` |
| Edit | `server/utils/dashboardSummary.ts` — optional cleanup |
| Edit | `app/pages/editor/journals/[uuid].vue` — remove desk review UI |
| Edit | `app/utils/workspace.ts` — remove copy-desk special case |
| Edit | `app/components/journal/JournalNavbar.vue` — remove copy-desk nav link |
| Edit | `app/middleware/role.ts` — remove copy-desk redirect |
| Edit | `app/pages/author/index.vue` — update journey funnel |
| Edit | Tests (4 files) |
| Edit | Docs (2 files) |

## Risks

1. **Existing `desk_review` rows in production.** Mitigated by B3 (the migration moves them).
2. **Seeds are additive-only.** The new permissions for `copy_desk_editor` will be added on next
   seed run, but the old limited set won't be removed. For production, the admin must either
   re-seed or manually grant the permissions via the admin UI.
3. **`EDITOR_ROLES_WITH_COPY_DESK` becomes redundant.** Left as alias for now; cleaned up in the
   configurable-permissions task.
