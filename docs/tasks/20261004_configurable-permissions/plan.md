# Plan: Configurable permissions — make the existing permission system actually work

## Overview

The DB schema, seed data, and `checkUserPermission` function already exist. This task wires
everything up so the admin can grant/revoke permissions in the UI and those permissions are
actually enforced by the routes.

Depends on: `promote-copy-desk-collapse-desk-review` (which adds `copy_desk_editor` to
`editorRoleKeys` and collapses `EDITOR_ROLES_WITH_COPY_DESK`).

---

## Phase 1 — Fix the admin permissions UI (revoke support)

### 1A. Change the "save permissions" endpoint to diff-and-sync

**File:** `server/api/roles/[id]/permissions.post.ts`

Currently inserts with `onConflictDoNothing`. Change to:

1. Receive `{ permissionIds: string[] }` (the full desired set).
2. Inside a transaction:
   a. Query existing `role_permissions` for this role.
   b. Compute `toAdd = desired - existing` and `toRemove = existing - desired`.
   c. Insert `toAdd`, delete `toRemove`.
3. Return the new set.

This makes the checkbox UI work as expected: unchecking a box actually revokes the permission.

### 1B. Delete `server/api/roles/[id]/permissions/[permId].delete.ts`

With 1A doing diff-and-sync, the individual-delete endpoint is redundant. It has no UI caller
today. Remove it to reduce surface area.

Or keep it as a programmatic escape hatch — developer's call.

### 1C. Update the admin UI to show current state correctly

**File:** `app/pages/admin/roles/[id].vue`

The checkbox group should initialize from the role's current permissions (it may already do
this — verify). On save, send the full `permissionIds` array. The diff-and-sync backend
handles the rest.

---

## Phase 2 — Fix the admin bypass

### 2A. Replace name-based bypass with flag-based

**File:** `server/utils/permissions.ts:56`

```ts
// Before
if (row.roleName === 'admin') return true

// After — check for a dedicated superadmin flag or a sentinel permission
if (row.action === 'manage' && row.resource === '*') return true
```

Alternative: add `isSuperAdmin: boolean` to the `roles` table (migration required). The
`admin` role gets `isSuperAdmin = true` in seeds; new custom roles default to `false`. The
permission check becomes:

```ts
// First check: is any of the user's roles a superadmin?
const hasSuperAdmin = permissionRows.some(row => row.isSuperAdmin)
if (hasSuperAdmin) return true
```

**Recommendation:** The sentinel-permission approach (`resource: '*', action: 'manage'`)
requires no migration and fits the existing model. Add a new permission definition:

```ts
{ name: 'superadmin', resource: '*', action: 'manage', scope: 'any',
  description: 'Full system access — bypasses all permission checks.' }
```

Grant it only to `admin`. The bypass check becomes:
```ts
if (row.resource === '*' && row.action === 'manage') return true
```

### 2B. Fix `getUsersWithPermission` — same hardcode

**File:** `server/utils/permissions.ts:158-191`

The admin-role-id lookup uses `roles.name === 'admin'`. Change to: include roles that hold the
`*:manage` sentinel permission (or the `isSuperAdmin` flag).

---

## Phase 3 — Migrate the coarse-guarded mutation

### 3A. `mark-published.post.ts` — use `requirePermission`

**File:** `server/api/editor/journals/[uuid]/mark-published.post.ts`

```ts
// Before
await requireEditorOrCopyDesk(event)

// After
await requirePermission(event, 'journal', 'publish')
```

This means only roles with `publish-manuscript` (currently EIC + admin + copy_desk_editor
after the promote task) can mark manuscripts published — managing editors without that
permission cannot. Correct behavior.

---

## Phase 4 — Audit bare-session endpoints

Verify each has inline ownership or assignment checks. Fix any gaps.

### 4A. `reviewer/journals/accept.post.ts`

Verify: must check that the reviewer row belongs to `session.user.id`. If it only checks
`requireSession`, add ownership verification.

### 4B. `reviewer/journals/decline.post.ts`

Same as 4A.

### 4C. `author/submissions/[id]/author-update.post.ts`

Verify: must check `journal.userId === session.user.id`.

### 4D. `author/submissions/[id]/feedback.get.ts`

Verify: must check ownership.

### 4E. `journals/[id]/versions/[versionId].get.ts`

Uses `assertVersionAccess` — verify this checks ownership or editorial role.

### 4F. `users/[id]/settings.patch.ts`

Verify: must check `params.id === session.user.id` (or admin).

### 4G. `users/[id]/notification-preferences.patch.ts`

Same as 4F.

**Deliverable:** For each endpoint, document the finding (safe / fixed) in the changelog.

---

## Phase 5 — Collapse dead code from the promote task

### 5A. Replace `EDITOR_ROLES_WITH_COPY_DESK` with `EDITOR_ROLES`

After the promote task, these are identical. Replace every import (~12 files) and delete the
constant from `shared/constants/roles.ts`.

### 5B. Delete `requireEditorOrCopyDesk`

Replace its 8 call sites with `requireEditor`. Delete the function from
`server/utils/permissions.ts`.

---

## Phase 6 — Clean up unenforced permissions

### 6A. Audit each permission definition

For each of the 23 permission definitions in `shared/constants/permissions.ts`, verify there
is at least one `requirePermission` or `checkUserPermission` call that checks its
`resource:action` pair.

**Currently unenforced** (no server-side call site):

| Permission | resource:action | Recommendation |
|---|---|---|
| `copy-edit-manuscript` | `journal:copy_edit` | Add check to future copy-edit endpoint, or remove |
| `final-edit-manuscript` | `journal:final_edit` | Same |
| `prepare-for-publication` | `journal:prepare_publication` | Same |
| `upload-revision` | `journal:revision` | revision.post.ts uses `requireAuthor` — could add |
| `manage-review-process` | `review:manage` | Used as wildcard in `checkUserPermission` (line 64 — `action === 'manage'` matches any review action). Already enforced indirectly. Keep. |
| `coordinate-reviews` | `review:coordinate` | No call site. Remove or add enforcement |
| `review-manuscript` | `review:submit` | No call site. submit-review.post.ts uses `requireReviewer`. Could add |
| `provide-feedback` | `review:feedback` | No call site. Could add |
| `read-public-journals` | `journal:read` | No call site. Public read is unauthenticated. Keep as semantic documentation |
| `read-notifications` | `notification:read` | No call site. Notifications endpoint uses bare session. Keep as semantic documentation |
| `read-categories` | `category:read` | No call site. Categories are public. Keep as semantic documentation |

**Recommendation:** Don't remove the semantic-documentation permissions (they help the admin
understand what each role is for). Do add enforcement for `review:submit` and `review:feedback`
in the reviewer endpoints — these are the highest-value additions since they'd let an admin
revoke a specific reviewer's ability to submit reviews without removing their role entirely.

---

## Phase 7 — Seeds cleanup

### 7A. Make seeds diff-aware for role-permissions

Currently `server/db/seeds/system.ts` only adds. Add a cleanup step: for each system role,
after inserting the desired permissions, delete any `role_permissions` rows that are in the DB
but not in the code definition — but ONLY for system roles (`isSystem = true`). Custom roles
are untouched.

This ensures that re-running seeds on production after a permission is removed from a system
role actually revokes it.

---

## File change summary

| Phase | Action | File |
|-------|--------|------|
| 1 | Edit | `server/api/roles/[id]/permissions.post.ts` — diff-and-sync |
| 1 | Delete or keep | `server/api/roles/[id]/permissions/[permId].delete.ts` |
| 1 | Verify | `app/pages/admin/roles/[id].vue` |
| 2 | Edit | `server/utils/permissions.ts` — admin bypass + getUsersWithPermission |
| 2 | Edit | `shared/constants/permissions.ts` — add `superadmin` sentinel permission |
| 3 | Edit | `server/api/editor/journals/[uuid]/mark-published.post.ts` |
| 4 | Audit + fix | 7 bare-session endpoints |
| 5 | Edit | ~12 files replacing `EDITOR_ROLES_WITH_COPY_DESK` |
| 5 | Edit | `server/utils/permissions.ts` — delete `requireEditorOrCopyDesk` |
| 5 | Edit | `shared/constants/roles.ts` — delete `EDITOR_ROLES_WITH_COPY_DESK` |
| 6 | Edit | 2-3 reviewer endpoints — add permission checks |
| 7 | Edit | `server/db/seeds/system.ts` — diff-aware cleanup |

## Risks

1. **Phase 2 (admin bypass) is the highest-risk change.** If the sentinel permission isn't
   seeded correctly, the admin loses all access. Mitigation: the migration/seed that adds the
   sentinel permission must run in the same deployment. Test thoroughly.
2. **Phase 7 (seed cleanup) could accidentally revoke production permissions.** Mitigation:
   only clean up `isSystem = true` roles; never touch custom roles.
3. **Phase 1 (revoke support) changes a POST endpoint's semantics.** Any external caller
   (if any) that sends partial permission lists will accidentally revoke the rest. Mitigation:
   this endpoint has no external callers — it's only used by the admin UI.
