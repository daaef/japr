# JAPR — Editorial Workflow Improvement Plan (Cursor implementation prompt)

> **Purpose:** A code-verified, staged plan to harden japr's peer-review workflow toward
> the standards of real academic journals (Editorial Manager / ScholarOne / OJS), fix the
> bugs carried over from the Laravel original, and close the remaining parity gaps.
> **Audience:** Cursor (or any coding agent) working *with the developer*.
> **Source of findings:** A read-only review of both `c:\Users\reala\Creations\journal`
> (Laravel reference) and this repo, 2026-06-26. Every claim below cites `file:line` so you
> can verify before changing. Line numbers are accurate as of that review — re-open the file
> and confirm the code still matches before editing.

---

## 0. How to use this document

This is a **prompt + plan**, not a spec to apply blindly. For each task:

1. **Open the cited files and confirm the described behavior still exists** before changing anything. If the code has moved, find the equivalent — do not guess.
2. Implement **one task per commit/PR**, in the lane order below (Lane 1 → 5). Lanes are ordered by risk.
3. After each task, run the **acceptance check** listed for it. If there's no automated test, add one (see Lane 6).
4. **Do not break parity with the Laravel reference** unless a task explicitly says to diverge. japr is intentionally a parity port; cosmetic/route changes that drift from `docs/parity-matrix.md` need a note there.
5. **Explain each change back to the developer in one or two plain-English sentences** in the PR description, including *why* the old behavior was wrong. This is a teaching codebase — a change the developer can't explain is not done.

### Hard guardrails for the agent

- **Schema = migrations only.** Add columns/enums via `drizzle-kit generate` → a new `server/db/migrations/000X_*.sql`, register it in `server/db/migrations/meta/_journal.json`, and update `server/db/schema/*`. **Never** use `db:push` against a real DB (it's deliberately renamed `db:push:experimental`). After any schema change, `pnpm db:check` must still pass (`server/db/check.ts`).
- **Enums:** `approval_status` is a real Postgres enum (`server/db/schema/journals.ts:16-26`). Adding a value requires `ALTER TYPE ... ADD VALUE` in a migration (see `0001_workflow_statuses.sql` for the pattern). Postgres can't add an enum value and use it in the same transaction — keep the `ALTER TYPE` in its own migration step.
- **Don't invent status strings.** The authoritative set is the 9-value enum (Lane 2.2). Every queue/guard/badge/email must reference the shared constant, never a literal.
- **No new auth bypasses.** All mutating endpoints must keep a `require*` guard.
- **Email + notification preferences** must be respected on any new send (use `sendIfEmailAllowed`, `server/utils/notificationPreferences.ts:18`).

---

## 1. What japr already fixed (do NOT redo these)

For context, these journal-original bugs are **already resolved** in japr — verified — so the plan does not touch them:

- `approval_status` is a typed Postgres enum, not a free string (`server/db/schema/journals.ts:16-26`).
- Editor decisions have status guards via `assertManuscriptStatus` (e.g. `approve.post.ts:31-35`, `reject.post.ts:31-35`) — the journal `approveJournal()` had none.
- `approve-for-publication.post.ts:44-49` enforces a **≥2 completed reviews** minimum.
- Email notification preferences are genuinely enforced on the live path (`server/utils/notificationPreferences.ts:8-26`, used by every email send) — journal's preference class was never instantiated.
- Real email-activation gate before login, enforced at the better-auth session hook (`auth.ts:75-92`).
- Stronger download authorization (`server/api/journals/[id]/download.get.ts:50-66`).

---

## LANE 1 — Security & correctness bugs (do first)

### 1.1 — Reviewer de-anonymization & confidential-comment leak to authors  **[CRITICAL / security]**

**Problem (verified).** Peer review confidentiality is broken in two author-facing endpoints:

- `server/utils/submissions.ts:31-35` (`getJournalDetails`) returns **raw `reviewers` table rows**. `server/api/author/submissions/[id].get.ts:19` returns that object **wholesale** with only an ownership check (`:15`). The `reviewers` schema (`server/db/schema/reviewers.ts`) includes the reviewer's real `fullname`, `userId`, the accept/decline `token`, `confidentialComments`, and `rating` — so any author can fully de-anonymize their reviewers and read editor-only confidential comments by calling `/api/author/submissions/{id}`.
- `server/api/author/submissions/[id]/feedback.get.ts:22-31` hand-shapes the response but still exposes `confidentialComments` (`:27`) and the numeric `rating` (`:24`) to the author.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts:77` also writes `reviewers: [{userId, fullname}]` onto the `journals` row, so `details.journal.reviewers` carries identities too.

In a real journal, reviewer identity is hidden from authors (single/double-blind), and "confidential comments to the editor" are **never** shown to the author.

**Approach.**
1. Introduce a single **author-safe reviewer projection** used by *every* author-facing path — e.g. a helper `toAuthorReviewerView(row)` in `server/utils/submissions.ts` that returns only `{ id: <anonymized label e.g. "Reviewer 1">, recommendation, comment, criteriaRatings, status, reviewSubmittedAt }`. **Exclude** `fullname`, `userId`, `token`, `confidentialComments`, and (decide with the developer) `rating`.
2. Make `getJournalDetails` accept an audience flag, or add a dedicated `getAuthorSubmissionView(id)` that never returns raw reviewer rows. Update `[id].get.ts` and `feedback.get.ts` to use it.
3. Strip reviewer identities from `details.journal.reviewers` for the author audience (or stop denormalizing identity onto the journal row and derive it editor-side only).
4. Confirm the editor/reviewer endpoints still get the full view (they legitimately need names) — only the **author** audience is restricted.

**Acceptance.**
- As an author, `GET /api/author/submissions/{id}` and `.../feedback` return **no** reviewer `fullname`, `userId`, `token`, or `confidentialComments`. Add a test asserting these keys are absent.
- As an editor, the reviewer name is still visible on the editor detail endpoint.

---

### 1.2 — `request-revisions` has no status guard  **[bug / consistency]** (was B7)

**Problem (verified).** `server/api/editor/journals/[uuid]/request-revisions.post.ts` only calls `requireEditor` (`:17`) and unconditionally writes `approvalStatus: 'changes_requested'` (`:30-39`). It does **not** import or call `assertManuscriptStatus`, so an editor can push a `pending`, `approved`, or even `declined` manuscript into `changes_requested`. Every *other* editor decision guards its source state.

**Approach.** Add `assertManuscriptStatus(journal.approvalStatus, [...allowed], 'requesting revisions')` with an allow-list consistent with the canonical state machine (Lane 2.2) — e.g. `['under_peer_review', 'ready_for_managing_editor_notice', 'reviewed', 'in-progress']`.

**Acceptance.** Requesting revisions on a `declined`/`approved` manuscript returns 409; on a reviewing-stage manuscript it succeeds.

---

### 1.3 — Two divergent `approve` endpoints  **[bug / authz]**

**Problem (verified).** Both `approve.post.ts` and `approve-for-publication.post.ts` move a `reviewed` manuscript to `approved`, but:
- `approve.post.ts` sets `approvedAt` (`:43`) and has **no min-reviews guard** — an editor can approve a `reviewed` manuscript with **zero completed reviews**.
- `approve-for-publication.post.ts` sets `publishedAt` (`:56`) and **does** enforce ≥2 reviews (`:44-49`).

They write different timestamp fields and apply different rules to the same logical action.

**Approach (decide with the developer which model you want):**
- **Option A (recommended):** make `approve.post.ts` the single "editorial accept" (sets `approvedAt`, enforces the same ≥2-review guard), and treat `approve-for-publication` as a *separate later stage* that only runs on an already-`approved` manuscript and sets `publishedAt`/drives copy-desk (ties into Lane 2.3). This separates "accepted" from "published" cleanly, as real journals do.
- **Option B:** collapse the two into one endpoint if publication is not a distinct stage.
- Either way: **one rule for the review minimum**, consistent timestamps.

**Acceptance.** No path reaches `approved` with `<2` completed reviews. `approvedAt` and `publishedAt` are set at well-defined, distinct moments. Document the choice in `docs/REMEDIATION_AND_PROCESS_FLOW.md` §B.1.

---

### 1.4 — Dual review-completion engines that disagree  **[bug / workflow integrity]**

**Problem (verified).** Two independent engines set completion status:
- **Count-based** `syncJournalReviewStatus` (`server/utils/journalWorkflow.ts:13-43`), called from `submit-review.post.ts:44`: `≥2` complete → `ready_for_managing_editor_notice`, else `under_peer_review`/`reviewed`/`in-progress`.
- **Vote/percentage** in `reviewer/journals/decline-with-comment.post.ts:49-75`: `>50%` decline → `declined`, else `reviewed` — it never produces `under_peer_review`/`ready_for_managing_editor_notice`.

They model a *declined* reviewer oppositely (engine A's `allComplete` treats `status==='declined'` as never-complete and blocks forever; engine B counts it as "responded"). A manuscript's terminal status depends on which reviewer action fired last.

**Approach.** Make `syncJournalReviewStatus` the **single source of truth** for review-stage status:
1. Have it account for *all* terminal reviewer states (`reviewed` **and** `declined`) when computing "all responded", so a declined reviewer doesn't deadlock the queue.
2. Route `decline-with-comment` to record the decline + comment, then call the **same** `syncJournalReviewStatus` instead of its own vote math. If you want a "majority decline → auto-decline" rule, put that *inside* `syncJournalReviewStatus` as the one place it lives.
3. Audit `decline-with-comment.post.ts:53-54`: the "all responded" check uses `item.comment` while the tally uses `isAccepted === false` (false by default for not-yet-responded reviewers) — fix this when consolidating.

**Acceptance.** Add a test that drives: assign 3 reviewers → 1 declines, 2 submit → status is deterministic and identical regardless of action order. No manuscript can deadlock because a reviewer declined.

---

## LANE 2 — Workflow fidelity to real academic journals

> These are the "make it work like a real journal" improvements. None of them exist in the
> Laravel original either, so this is net-new editorial maturity, not just parity.

### 2.1 — Add a desk-triage / desk-decision step  **[biggest editorial gap]**

**Problem.** Every submission goes straight from `pending` to reviewer assignment. Real journals have an **Editor-in-Chief desk-review** first: desk-reject out-of-scope work, or assign a handling editor, *before* burning reviewer time.

**Approach.**
1. Add an enum value (migration) e.g. `desk_review` (or reuse `pending` as "awaiting desk decision" and add `desk_rejected`). Discuss with the developer; minimize new states.
2. New editor endpoints: `desk-reject` (→ terminal `declined` with a `deskReject: true` flag/decision type) and `send-to-review` (→ allows assign-reviewers). Gate assign-reviewers so it can only run after a desk decision.
3. Surface a `/editor/desk-review` queue.

**Acceptance.** A manuscript cannot be assigned reviewers until an editor has made a desk decision; desk-reject notifies the author with a reason and never enters peer review.

---

### 2.2 — One documented, enforced state machine  **[consistency]**

**Problem.** The canonical machine is already drawn in `docs/REMEDIATION_AND_PROCESS_FLOW.md:142-181`, but statuses are still referenced as literals in places and the two completion vocabularies (`reviewed` vs `ready_for_managing_editor_notice`) overlap.

**Approach.**
1. Create `shared/constants/manuscriptStatus.ts` exporting the 9 enum values + a `STATUS_LABELS`/`STATUS_COLORS` map and an `ALLOWED_TRANSITIONS` table.
2. Refactor every queue endpoint, guard, badge component, and email to import from it — no literal status strings anywhere (grep for `'reviewed'`, `'approved'`, `'pending'`, etc. and replace).
3. Decide the canonical "reviews done" state for the editor decision step (recommend: `ready_for_managing_editor_notice` is the consensus state; make `reviewed` an explicit alias or remove it) and make all `approve`/`reject` guards key off that single state.

**Acceptance.** `assertManuscriptStatus` and all queues reference the shared constant; `pnpm typecheck` passes; a grep for hard-coded status literals in `server/api` returns only the constants file.

---

### 2.3 — Implement the `published` terminal state + copy-desk hand-off  **[completeness]**

**Problem (verified).** There is **no `published` enum value** (`journals.ts:16-26`); `copy_edit_status` exists (`journals.ts:77`) but is **never written**; `requireEditorOrCopyDesk` appears only on **GET** endpoints — there is no copy-desk action. So publication terminates implicitly at `approved` + a `publishedAt` timestamp. The Copy Desk Editor role is effectively decorative.

**Approach.**
1. Add `published` to the `approval_status` enum (migration).
2. Add a copy-desk action endpoint (e.g. `POST /api/editor/journals/[uuid]/mark-published`) gated by `requireEditorOrCopyDesk`, allowed only from `approved`/`approved_with_comment`, that sets `copy_edit_status` and `approval_status = 'published'` + `publishedAt`.
3. Ensure public listing/search shows **only** `approved`/`approved_with_comment`/`published` (confirm the public query filter).
4. Surface a `/editor/copy-desk` action button (currently read-only).

**Acceptance.** An approved manuscript can be moved to `published` only by copy-desk/editor; public pages show published items; the Copy Desk role has at least one real action.

---

### 2.4 — Separate Editor-in-Chief vs Managing Editor duties  **[separation of duties]**

**Problem (verified).** `requireEditor` = `['admin','editor_in_chief','managing_editor']` (`server/utils/permissions.ts:127-129`); every mutating endpoint uses it, so the two editor roles are interchangeable. `send-approval-notice.post.ts:52` even hard-codes "Managing Editor" wording regardless of caller.

**Approach.** Use the permission rows that already exist (`shared/constants/permissions.ts`) with `requirePermission` instead of coarse `requireEditor`:
- **Managing Editor:** `assign-reviewers`, `send-approval-notice`/`send-decline-notice`.
- **Editor-in-Chief:** `final-approve-manuscript`/`final-reject-manuscript`, `approve-for-publication`, desk decisions.
Keep `admin` allowed everywhere.

**Acceptance.** A Managing Editor cannot call final-approve/publication; an Editor-in-Chief retains it. Add per-role authz tests.

---

### 2.5 — Notify the author at *every* transition  **[transparency, matches major journals]**

**Problem (verified).** The author is **not** notified when: reviewers are assigned / status → `in-progress`; status → `under_peer_review`; status → `ready_for_managing_editor_notice` (`assign-reviewers.post.ts:84-107` notifies reviewers only; `syncJournalReviewStatus` emits nothing). Authors only hear at terminal decisions. Real journals notify on every state change.

**Approach.** Centralize: whenever `approval_status` changes, emit a single author-facing `manuscript-status-changed` notification (in-app always; email gated on the `manuscript_status` preference via `sendIfEmailAllowed`). The cleanest place is a small `setManuscriptStatus(journal, newStatus, { notifyAuthor: true })` helper that all transition code routes through (pairs naturally with Lane 2.2). **Use neutral copy** — do not leak reviewer names/ratings (ties to Lane 1.1).

**Acceptance.** Driving the full lifecycle produces an author notification at assignment, peer-review entry, managing-editor stage, and final decision. No notification exposes reviewer identity.

---

## LANE 3 — Parity gaps (journal features missing in japr)

### 3.1 — Reviewer deadlines & extensions  **[MISSING, medium]**

**Reference.** Laravel `app/Models/Reviewer.php` (`isOverdue`, `getDaysRemaining`, `requestDeadlineExtension`, `approveDeadlineExtension`, `setDefaultDeadline` — 14-day default) + migration `2025_01_15_000004_add_deadline_fields_to_reviewers_table.php` (columns `review_deadline`, `deadline_extension_requested`, `deadline_extension_reason`, `deadline_extended_at`, `original_deadline`). Note: Laravel never wired these to routes, so japr can do it *better*.

**japr status.** `server/db/schema/reviewers.ts:5-39` has no deadline columns; no endpoints.

**Approach.** Add the 5 columns (migration + schema). On `assign-reviewers`, set `review_deadline = now + 14d`. Add `POST /api/reviewer/journals/[uuid]/request-extension` and an editor `approve-extension`. Add a reviewer-dashboard "days remaining / overdue" indicator. (Optional later: a reminder cron — ties to Lane 4.2.)

**Acceptance.** Assignment sets a deadline; reviewer can request an extension; editor can approve; overdue assignments are visibly flagged.

---

### 3.2 — Reviewer "approve-with-comment" endpoint  **[PARTIAL, low]**

**Reference.** Laravel `EloquentJournalRepository::approveJournalWithComment` (route `web.php:365`). japr has `decline-with-comment` but no positive counterpart; positive reviews go through `submit-review`.

**Approach.** Confirm with the developer this is actually wanted — `submit-review` with `recommendation: 'accept'` may already cover it. If a distinct endpoint is desired for parity, add `reviewer/journals/approve-with-comment.post.ts` that records the approval comment and routes through the unified `syncJournalReviewStatus` (Lane 1.4). **Low priority.**

**Acceptance.** Either documented as intentionally covered by `submit-review`, or a parity endpoint exists.

---

### 3.3 — Admin Audit Log  **[MISSING, scope decision]**

**Reference.** Laravel `AdminAuditLog.php` + `AdminAuditController.php` (index/show/dashboard/export/cleanup) + migration `2025_01_15_000005_create_admin_audit_logs_table.php` + audit views. japr: **no equivalent** (acknowledged out-of-scope in `docs/FLOW_VERIFICATION_REPORT.md:158`).

**Approach (only if audit visibility matters for the demo/compliance).** Add an `admin_audit_logs` table (migration + schema), a thin `logAudit(event, action, resource, before, after)` util called from sensitive mutations (role changes, user CRUD, editorial decisions, deletes), an admin read API, and an `/admin/audit` page. Keep it append-only.

**Acceptance.** Sensitive admin/editorial actions write an audit row; admin can view/filter/export them.

---

### 3.4 — Confirm the `assign-associate-editors` → `assign-reviewers` rename  **[divergence check, trivial]**

Laravel defines `assign-associate-editors` (`RoleAndPermissionSeeder.php:35`); japr substitutes `assign-reviewers` (`shared/constants/permissions.ts`). Confirm this rename is deliberate and note it in `docs/parity-matrix.md`. No code change if intentional.

---

## LANE 4 — Notification completeness

### 4.1 — Respect in-app notification preferences  **[gap, medium]**

**Problem (verified).** `createNotification`/`createNotifications` (`server/utils/notifications.ts:5-38`) insert DB rows and push SSE **unconditionally** — they never read the `in_app` preference object (`realtime`/`sound`/`desktop`), which is therefore write-only. (Email prefs *are* respected; only in-app is not.)

**Approach.** Gate `createNotification` (and the SSE publish) on the user's `in_app.realtime` preference, mirroring `sendIfEmailAllowed`. Keep a DB row for the bell even if realtime push is off, unless the developer wants full suppression — decide explicitly.

**Acceptance.** A user who disables realtime in-app notifications stops receiving SSE pushes; the preference has an observable effect.

---

### 4.2 — Implement or remove `frequency` / `weekly_summary`  **[write-only stubs]**

**Problem (verified).** `frequency` and `weekly_summary` are persisted (`server/db/schema/users.ts:57,64`, validated `shared/validation/notifications.ts:8,15`) but **never read** anywhere — all email fires immediately regardless.

**Approach.** Either (a) implement a digest: a scheduled task that batches `manuscript_status`/`new_submissions` emails for users whose `frequency` ≠ `immediate` and a weekly summary when `weekly_summary` is true; or (b) if out of scope, **remove the UI controls** so you don't promise behavior that doesn't exist. Pick one with the developer.

**Acceptance.** The stored `frequency`/`weekly_summary` either changes delivery, or is no longer surfaced to users.

---

## LANE 5 — Hygiene

- **5.1 Remove the dead `approvals` table.** `server/db/schema/approvals.ts` + the `approval_status_simple` enum are defined and migrated but **no endpoint reads/writes them** (grep `approvals` in `server/api` = 0 hits). Carried over from Laravel. Drop via migration (or document as intentionally reserved). Decisions already live on `journals` columns + `journalComments`.
- **5.2 Strengthen the password policy.** `shared/validation/auth.ts:9` is `min(8)` length-only. Add complexity and/or a breached-password check (decide the rule with the developer). Apply to sign-up and reset.
- **5.3 Collapse the redundant signup role-assignment.** `author` is assigned in *both* `sign-up.post.ts:54-59` **and** the better-auth `databaseHooks.user.create.after` hook (`auth.ts:53-72`). Currently idempotent (the hook guards with `if (!existing)`), but two sources of truth is a footgun — keep one (recommend the hook, so OAuth signups are covered too) and document it.
- **5.4** Escape user input in email templates if `EMAIL_TRANSPORT` will ever be `resend` (per `docs/REMEDIATION_AND_PROCESS_FLOW.md` B6), and consolidate the two HTML email builders.

---

## LANE 6 — Tests (do alongside, not after)

The lifecycle is currently verified by hand. Add automated coverage as you go:

1. **State-machine test:** submit → desk-accept → assign 3 reviewers → 1 decline + 2 reviews → managing-editor notice → approve → publish. Assert the status at each step and that order-independence holds (Lane 1.4).
2. **Authz matrix test:** each `require*`/`requirePermission` guard rejects the wrong roles (Lane 2.4).
3. **Confidentiality test:** author endpoints never leak reviewer identity / confidential comments (Lane 1.1).
4. **Fresh-DB smoke (CI):** `db:migrate → db:seed → db:check` → all 8 seed roles sign in (200). (Already prescribed in the remediation doc §C.)

---

## Recommended sequencing

| Order | Lane | Why first |
|------|------|-----------|
| 1 | **1.1** confidentiality leak | Active data exposure; highest risk. |
| 2 | 1.2, 1.3, 1.4 | Workflow-integrity bugs; small, high-confidence. |
| 3 | 2.2 single state machine | Foundation the rest keys off. |
| 4 | 2.5 notify-every-transition, 2.4 role split | Build on the state machine. |
| 5 | 2.1 desk triage, 2.3 published/copy-desk | Larger editorial features. |
| 6 | 3.1 deadlines, 4.1/4.2 notifications | Parity + polish. |
| 7 | 3.3 audit log, 5.x hygiene | Scope-dependent / cleanup. |

Each item lists its own acceptance check; a task isn't done until that check passes **and** the change is explained in the PR.

---

## Appendix — key files referenced

| Concern | File(s) |
|---|---|
| Status enum & journal schema | `server/db/schema/journals.ts:16-26,42,77`; `server/db/migrations/0001_workflow_statuses.sql` |
| Completion engine | `server/utils/journalWorkflow.ts:13-43`; `server/api/reviewer/journals/decline-with-comment.post.ts:49-75` |
| Editor decisions | `server/api/editor/journals/[uuid]/{approve,approve-for-publication,reject,request-revisions,send-approval-notice,send-decline-notice,assign-reviewers}.post.ts` |
| Guards | `server/utils/permissions.ts:111-129`; `assertManuscriptStatus` (see imports in approve.post.ts) |
| Author-facing leaks | `server/utils/submissions.ts:15-36`; `server/api/author/submissions/[id].get.ts`; `.../[id]/feedback.get.ts:22-31` |
| Notifications | `server/utils/notifications.ts:5-38`; `server/utils/notificationPreferences.ts:8-26`; `server/api/notifications/stream.get.ts` |
| Auth | `auth.ts:34-92`; `server/api/auth/sign-up.post.ts`; `shared/validation/auth.ts:6-14` |
| Roles/permissions | `shared/constants/roles.ts:1-23`; `shared/constants/permissions.ts:20-136` |
| Reviewers schema | `server/db/schema/reviewers.ts:5-39` |
| Dead approvals table | `server/db/schema/approvals.ts` |
| Existing canonical flow doc | `docs/REMEDIATION_AND_PROCESS_FLOW.md:142-256` |
