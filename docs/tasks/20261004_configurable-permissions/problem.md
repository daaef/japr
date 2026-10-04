# Problem: Permission system exists but is only partially wired

## Symptoms

1. **The admin cannot meaningfully customize what each editor role can do.** There is a roles
   admin page (`admin/roles/[id].vue`) with a checkbox grid, but it can only *add* permissions
   to a role — unchecking a box and saving does nothing. The `DELETE /api/roles/[id]/permissions/
   [permId]` endpoint exists but has no UI caller. So in practice the permission UI is
   write-once.

2. **Most endpoints gate on role name, not permission.** Out of ~65 protected API routes, only
   ~12 use `requirePermission` or `checkUserPermission`. The rest use `requireAdmin`,
   `requireEditor`, `requireReviewer`, or `requireAuthor` — which check the user's role name
   against a hardcoded list, ignoring the permissions table entirely. Even if an admin removes
   `assign-reviewers` from `managing_editor` via the DB, the managing editor can still reach
   every `requireEditor` endpoint.

3. **Several seeded permissions are never enforced.** 10+ permission rows exist in the DB
   (`journal:copy_edit`, `journal:final_edit`, `journal:prepare_publication`,
   `journal:revision`, `review:coordinate`, `review:manage`, `review:submit`,
   `review:feedback`, `category:read`, `notification:read`) with no corresponding
   `requirePermission` call site. They're granted but never checked.

4. **The admin bypass is by role *name*, not by a flag.** `checkUserPermission` (line 56) does
   `if (row.roleName === 'admin') return true`. A custom role named `admin` gets full access;
   renaming the admin role breaks it. `getUsersWithPermission` (line 158) has the same
   hardcode.

## Root causes

- The permission infrastructure (`roles`, `permissions`, `role_permissions`, `user_roles` tables
  + `checkUserPermission` function) was built early but most route handlers were written using
  the simpler `requireAnyRole` pattern and never migrated.
- The admin UI's "save permissions" POST is additive-only (inserts with `onConflictDoNothing`)
  and does not diff against the current set.
- Seeds are also additive-only — removing a permission from `systemRoles` in code doesn't
  remove it from the DB.

## Scope

This task:
1. Audits every endpoint and migrates role-name guards to permission-based guards where
   appropriate.
2. Fixes the admin permissions UI to support revoking permissions (diff-and-sync).
3. Cleans up the admin bypass to be flag-based rather than name-based.
4. Ensures every seeded permission has at least one enforcement point or is removed.
5. Does NOT add new permissions or a new UI — it makes the existing system actually work.

## Detailed audit — current guard usage

### Endpoints using `requireAdmin` (33 routes)

These are admin-panel operations: user CRUD, role CRUD, category CRUD, audit logs, admin
dashboard, test email, file cleanup, admin journal detail. Most of these should stay
admin-only — the question is whether `copy_desk_editor` (now an editor) should access any
of them.

**Recommendation:** Keep `requireAdmin` for all of these. In the future, if the team wants
copy desk editors to manage categories or view audit logs, add a new permission
(`category:manage`, `audit:read`) and gate on that instead.

### Endpoints using `requireEditor` (8 routes)

Editor queue list pages: pending, in-progress, under-peer-review, revision-requested,
reviewed, ready-for-notice, declined, plus `approved.get.ts` (which actually uses
`requireEditorOrCopyDesk`).

**Recommendation:** These are read-only list endpoints. A single permission like
`journal:list` (scope `any`) could gate all of them, or they can stay role-name-gated since
the role group now includes copy desk editor (from the promote task). Low priority for
migration.

### Endpoints using `requireEditorOrCopyDesk` (8 routes)

Editor dashboard, journal detail, enhanced review, regional assignment, mark-published,
copy-desk queue, published queue, approved queue.

**Recommendation:** After the promote task, `requireEditorOrCopyDesk` is identical to
`requireEditor`. Collapse into `requireEditor` and delete `requireEditorOrCopyDesk`.

### Endpoints using `requireReviewer` (12 routes)

Reviewer dashboard, queue pages, submit review, decline with comment, request change,
request extension, enhanced review.

**Recommendation:** These are correctly scoped — reviewer-class roles need reviewer-class
access. Could add `review:access` permission but low value since the role group is stable.

### Endpoints using `requireAuthor` (5 routes)

Author submissions, revision upload, interests.

**Recommendation:** Correctly scoped. Low priority.

### Endpoints using `requirePermission` (10 routes) — ALREADY CORRECT

send-to-review (`journal:approve`), approve (`journal:approve`), decline (`journal:reject`),
desk-decline (`journal:reject`), request-revisions (`journal:request_revisions`),
assign-reviewers (`reviewer:assign`), approve-extension (`reviewer:assign`),
send-approval-notice (`journal:send_approval_notice`),
send-decline-notice (`journal:send_decline_notice`),
approve-for-publication (`journal:publish`).

These are the most important ones and they're already correct.

### Endpoints using bare `requireSession` (7+ routes)

`reviewer/journals/accept.post.ts`, `reviewer/journals/decline.post.ts`,
`author/submissions/[id]/author-update.post.ts`, `author/submissions/[id]/feedback.get.ts`,
`journals/[id]/versions/[versionId].get.ts`, `users/[id]/settings.patch.ts`,
`users/[id]/notification-preferences.patch.ts`.

**Recommendation:** Verify each has inline ownership/assignment checks. If not, add them.
These are the highest-risk gap.

### Mutation using coarse guard

`mark-published.post.ts` uses `requireEditorOrCopyDesk` (coarse) instead of
`requirePermission(event, 'journal', 'publish')`. This means any editor can publish, even
without the `publish-manuscript` permission.

**Recommendation:** Migrate to `requirePermission`.

## Priority ordering

1. **Fix admin UI** — revoke support (diff-and-sync POST).
2. **Fix admin bypass** — flag-based, not name-based.
3. **Migrate `mark-published.post.ts`** — coarse guard on a destructive action.
4. **Audit bare `requireSession` endpoints** — verify ownership checks.
5. **Collapse `requireEditorOrCopyDesk` into `requireEditor`** — dead code after promote task.
6. **Remove unenforced permissions or add enforcement** — clean up noise.
7. **Migrate read-only list endpoints** — lowest priority, already safe.
