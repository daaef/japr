# Plan: Promote desk_editor (submissions visibility + backup reviewer assignment)

> **Superseded 2026-10-10 — not implemented.** See `docs/tasks/20261010_collapse-desk-editor-role/`.
> The stakeholder confirmed `desk_editor` and `copy_desk_editor` are meant to be the same role,
> so `desk_editor` is retired rather than promoted.

## Step 1 — Grant the permission (needed under either option below)

**File:** `shared/constants/permissions.ts`, the `desk_editor` entry (lines 118-128)

```ts
// Before
{
  name: 'desk_editor',
  description: 'Editorial desk',
  isSystem: true,
  permissions: [
    'manage-review-process',
    'coordinate-reviews',
    'review-manuscript',
    'provide-feedback',
    'read-public-journals'
  ]
}

// After
{
  name: 'desk_editor',
  description: 'Editorial desk — reviewer coordination plus backup reviewer assignment',
  isSystem: true,
  permissions: [
    'manage-review-process',
    'coordinate-reviews',
    'review-manuscript',
    'provide-feedback',
    'assign-reviewers',
    'read-public-journals'
  ]
}
```

Seeds are additive-only (confirmed in the 2026-10-04 task) — re-running `pnpm db:seed` adds this
grant without removing anything. On an existing DB where `desk_editor` already has other rows in
`rolePermissions`, this is a new row, not a replacement.

**This one change alone** makes `desk_editor` show up in `notifyAssignersOfReviewStart()`
(`editorNotifications.ts:69-96`, `getUsersWithPermission('reviewer', 'assign')`) — they'll start
getting the "ready for reviewer assignment" notice on every new submission, no other code change
needed for that part.

It does **not** yet let them reach the page/API that performs the assignment — that's Step 2,
where there's a real choice to make.

---

## Step 2 — Give access to act on it (pick one)

### Option A — Add `desk_editor` to `editorRoleKeys` (same mechanism as copy_desk_editor's Oct 4 promotion)

**File:** `shared/constants/roles.ts`

```ts
export const editorRoleKeys = ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor', 'desk_editor'] as const
```

- Simplest change — one line, matches precedent exactly.
- **Side effect:** `desk_editor` immediately gets `requiredRoles: EDITOR_ROLES` access to
  *every* editor page — `submissions.vue`, `in-progress.vue`, `approved.vue`, `declined.vue`,
  `published.vue`, `copy-desk.vue`, `settings.vue`, `reviews.vue`, editor notifications, the
  full dashboard — not just the one manuscript-detail page they need. The action buttons on
  those pages are mostly permission-gated (`can('journal','approve')` etc.), so `desk_editor`
  couldn't actually click approve/decline/publish without further permission grants — but they'd
  *see* those queues and that dashboard, which the meeting didn't ask for.
  - **This also changes workspace routing.** `app/utils/workspace.ts:8,28` checks the editor
    condition before the reviewer condition, so `desk_editor` would now land in the editor
    workspace/layout instead of the reviewer one — on top of still being listed in
    `reviewerRoleKeys` (`roles.ts:15`), which other code (`author-onboarding.ts`, `auth.ts`,
    `JournalNavbar.vue`, `review-policy.vue`, `pingTemplates.ts`, `regional-assignment.get.ts`)
    still checks independently. `desk_editor` would effectively be in both groups
    simultaneously, which hasn't been exercised anywhere else in the codebase.
- Also adds `desk_editor` to the "new manuscript submitted" notification (`EDITOR_ROLES` in
  `index.post.ts:75`), directly satisfying "receives all submissions" literally.
- **Would also need:** `shared/constants/permissions.ts` `desk_editor` grant from Step 1 kept as
  the narrow addition — do NOT also copy EIC/managing-editor's approve/decline/publish
  permissions the way copy_desk_editor got, since that's explicitly out of scope here.

### Option B — Narrow, page-by-page grant (no change to editorRoleKeys, reviewerRoleKeys, or workspace routing)

Leave `desk_editor` exactly where it is in `roles.ts` (reviewer-tier, unchanged routing). Instead:

**File:** `app/pages/editor/journals/[uuid].vue:30`
```ts
// Before
requiredRoles: EDITOR_ROLES
// After
requiredRoles: [...EDITOR_ROLES, 'desk_editor']
```

**Files:** `server/api/editor/journals/pending.get.ts:8`, `server/api/editor/journals/in-progress.get.ts:8`
Both call `requireEditor(event)`, which checks `editorRoleKeys` — `desk_editor` needs to reach
these two queues to find a manuscript to assign reviewers on. Either:
- add a `requireEditorOrDeskEditor` variant (mirrors the `requireEditorOrCopyDesk` helper that
  existed before the Oct 4 cleanup removed it — see `permissions.ts` git history for the shape), or
- change these two specific `requireEditor` calls to `requirePermission(event, 'reviewer', 'assign')`
  instead, which is actually more correct — it's exactly the permission that determines whether
  someone needs to see these queues, and it already covers `managing_editor`/`copy_desk_editor`/`admin`
  without listing them by name.

**New: "new manuscript submitted" notice.** If "receives all submissions" should include this
notice (not just the permission-driven "ready for assignment" one from Step 1), add a second,
separate recipient list in `server/api/journals/index.post.ts` rather than widening `EDITOR_ROLES`
itself — e.g. `getUsersWithPermission('reviewer', 'assign')` again, deduped against the editor
list, since that's the exact permission this task is granting `desk_editor`.

- More files touched, but `desk_editor` ends up with precisely the two capabilities asked for —
  nothing else changes for it anywhere (workspace, onboarding, nav, routing all untouched).
- Recommended: this matches the meeting's actual ask more precisely and has a far smaller blast
  radius than Option A, at the cost of touching 3-4 files instead of 1.

---

## Decision needed before implementation

1. Option A vs Option B for Step 2.
2. Does "desk editor receives all submissions" mean the `EDITOR_ROLES`-gated "new manuscript
   submitted" notice specifically, or is the permission-driven "ready for reviewer assignment"
   notice (free with Step 1) sufficient? They fire for the same event but are two separate
   notification types in the code today.

## File change summary (Option B, recommended)

| Action | File |
|--------|------|
| Edit | `shared/constants/permissions.ts` — add `assign-reviewers` to `desk_editor` |
| Edit | `app/pages/editor/journals/[uuid].vue` — widen `requiredRoles` for this page only |
| Edit | `server/api/editor/journals/pending.get.ts` — permission check instead of role check |
| Edit | `server/api/editor/journals/in-progress.get.ts` — permission check instead of role check |
| Edit (if in scope) | `server/api/journals/index.post.ts` — second notification path for the submission notice |

## Risks

1. **Seeds are additive-only** — production needs a re-seed or a manual admin-UI permission
   grant (the admin UI from the configurable-permissions task already supports this).
2. **Option A's workspace double-membership is untested territory** — no other role is
   currently in both `editorRoleKeys` and `reviewerRoleKeys` at once. If chosen, budget time to
   manually verify dashboard/nav/onboarding behavior for a `desk_editor` test account.
3. Dr. Ellen Whitworth (or whoever currently holds `desk_editor`) gains real new capability
   (reviewer assignment) the moment this ships — confirm that's intended for her specifically,
   independent of whether she separately moves to `admin` later.
