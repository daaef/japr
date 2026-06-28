# JAPR — Remediation Plan & Process-Flow Recommendation

> Author: runtime-parity verification pass, 2026-06-25.
> Scope: (A) a concrete plan to fix the bugs found while running the app end-to-end, and
> (B) a recommended canonical process flow for every role and the pages they use.
> Status legend: **CURRENT** = verified present behavior · **FIX** = proposed change · **REC** = recommendation.

---

## 0. Executive summary

Running japr against a real Postgres and driving the full editorial lifecycle proved the **functional/flow port is sound** — the manuscript state machine, role-based queues, and the `.data/mail` capture all behave as designed. But runtime surfaced a small number of real bugs (one of which silently breaks **all logins**), plus several hygiene/security issues. This document fixes those and then proposes a single, unambiguous process flow so the role/page surface stops carrying the original Laravel app's known inconsistencies.

Two themes drive the recommendations:
1. **One source of truth for schema** — migrations only; kill the fragile push/baseline drift.
2. **One source of truth for the workflow** — a single documented state machine that every page, queue, guard, and email keys off.

---

## PART A — BUG REMEDIATION PLAN

### A.0 Triage table

| # | Bug | Severity | Blast radius | Effort |
|---|-----|----------|--------------|--------|
| B1 | Migration drift: `notification_preferences` missing → every login 500s | **Critical** | Whole app unusable on a drifted DB | S–M |
| B2 | `drizzle.config.ts` fallback DB name is `japr_app` (≠ `japr`) | High | Migrations silently hit wrong DB when `DATABASE_URL` unset | XS |
| B3 | `/api/dev/mail` has a session gate but **no role gate** | High (sec) | Any logged-in user (even author) reads all mail incl. reset links / temp passwords | S |
| B4 | Dev port 4000 vs `BETTER_AUTH_URL`/`public.baseUrl` 3000 | Medium | Confusing auth/links in dev; absolute URLs point at wrong port | XS |
| B5 | Live-looking Resend API key committed in `.env` (gitignored but in tree) | Medium (sec) | Key exposure if tree shared | XS + rotate |
| B6 | Email templates interpolate user input into HTML unescaped | Medium (sec) | HTML/script injection in outbound mail once `EMAIL_TRANSPORT=resend` | S |
| B7 | `request-revisions.post.ts` has no `assertManuscriptStatus` guard | Low | Status can jump to `changes_requested` from any state | XS |

---

### B1 — Migration journal omits 0001/0002 → login breaks (CRITICAL) — **FIXED**

**CURRENT (corrected root cause — verified on a fresh DB).** Migrations `0001_workflow_statuses.sql` and `0002_notification_preferences.sql` exist on disk but were **never registered in `server/db/migrations/meta/_journal.json`** (it listed only `0000`). `drizzle-kit migrate` only runs migrations present in the journal, so **`0001`/`0002` never ran via `db:migrate` on *any* database** — proven by migrating a brand-new empty DB and finding `users.notification_preferences` and the two enum values still absent. Better-Auth `findUserByEmail` selects *all* user columns → **every sign-in returns HTTP 500** (`column "notification_preferences" does not exist`). (My first diagnosis blamed `db:baseline` timestamp drift; that was wrong — the fresh-DB test disproved it. The dual push/baseline path is still a real hazard, addressed below, but it was not the cause.)

**Root cause.** Hand-written SQL migrations added without `drizzle-kit generate`, so the journal/snapshots fell out of sync with the `.sql` files; plus no check that the live schema matches what the journal claims.

**DONE in this hotfix (verified):**
- Registered `0001`/`0002` in `meta/_journal.json` → `db:migrate` now applies all three on a fresh DB (column + enum values present, `__drizzle_migrations` has 3 rows) and reconciles the existing `japr` DB (idempotent SQL).
- Added `server/db/check.ts` (`assertSchema`) + `scripts/check-schema.ts` (`pnpm db:check`).
- Added `server/plugins/migrate.ts`: auto-migrates in dev and **hard-fails boot in all envs if the schema is missing required objects** — verified it logs `[boot-migrate] database schema OK` and login returns 200.
- Demoted `db:push` → `db:push:experimental` in `package.json`.

**FIX (do all three):**
1. **Make migrations the single source of truth.**
   - Treat `db:migrate` as the only supported way to reach a schema in every environment.
   - Demote `db:push` to an explicitly-labelled throwaway-only tool (rename script to `db:push:experimental` and document "never run against a DB you intend to keep").
   - Either delete `scripts/baseline-migrations.mjs` or harden it (see step 3).
2. **Run migrations automatically at server start** so the app can never be ahead of the DB.
   - Add a Nitro plugin (`server/plugins/migrate.ts`) that calls drizzle's `migrate()` on boot in non-test environments, then a lightweight schema assertion (below). This makes the drift self-healing and impossible to ship silently.
3. **Add a fail-loud schema check** (`scripts/check-schema.ts`, wired as `db:check` and run in CI + optionally at boot): assert that a known set of columns/enums exist (at minimum `users.notification_preferences`, `approval_status` enum contains `under_peer_review` and `ready_for_managing_editor_notice`). Exit non-zero with a clear message if not. This converts "silent 500 at login" into "loud failure at deploy".
4. **Harden `baseline-migrations.mjs` if kept:** after inserting rows, query `information_schema` and verify each migration's added objects actually exist; refuse to baseline (and print which object is missing) if the push'd schema is behind the SQL files.

**Verification (acceptance):**
- Drop & recreate an empty DB → `pnpm db:migrate && pnpm db:seed` → `pnpm db:check` passes → sign-in for all 8 seed roles returns 200. (This is the exact gap that was the only unsigned item in `FLOW_VERIFICATION_REPORT.md`.)
- Add a CI job that does the above against a fresh ephemeral Postgres on every PR.

---

### B2 — Wrong fallback DB name in drizzle config (HIGH, trivial)

**CURRENT.** `drizzle.config.ts`: `url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/japr_app'`. The real DB is `japr` (docker-compose, `.env`). If `DATABASE_URL` is ever unset, drizzle-kit silently targets a different/nonexistent database.

**FIX.** Remove the fallback and fail fast:
```ts
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required (no implicit fallback).')
```
Apply the same fail-fast to `scripts/baseline-migrations.mjs` (same `japr` fallback) and confirm `server/db/client.ts` does not carry a `japr_app` fallback either.

**Verification.** Unset `DATABASE_URL` → `pnpm db:migrate` errors clearly instead of "succeeding" against the wrong DB.

---

### B3 — `/api/dev/mail` lacks a role gate (HIGH, security) — ties into the debug-mail feature

**CURRENT (verified).** `server/api/dev/mail.get.ts` only checks `NODE_ENV !== 'production'`. The global `server/middleware/auth.ts` additionally blocks it without a session (returns **401**). But with **any** authenticated session it returns **200** and the full mailbox — an **author** cookie was confirmed to read every captured email (which includes password-reset links and admin temporary passwords).

**FIX (and this is the foundation for the demo debug-mail viewer the user wants):**
1. Gate the endpoint on **admin role** *and* an **explicit debug flag**, not just `NODE_ENV`:
   - Add `runtimeConfig.enableMailViewer` (env `NUXT_ENABLE_MAIL_VIEWER`, default `false`); also implicitly allow when `EMAIL_TRANSPORT==='local'` in non-prod.
   - In the handler: `requireAdmin(event)` + flag check; else `404`.
2. Add `GET /api/dev/mail/[id]` using the existing `getLocalEmail(id)` for single-message view.
3. Build the **frontend viewer** at `app/pages/admin/dev-mail.vue` (admin layout): list (`to`, `subject`, `createdAt`) + detail pane rendering `html` in a sandboxed `<iframe sandbox>` (never `v-html` — the captured HTML is untrusted). Link it from the admin nav only when the flag is on.
4. Reuse `listLocalEmails()`/`getLocalEmail()` — do **not** re-implement the reader.

**Verification.** With flag off → 404 for everyone. With flag on → 200 for admin, 403/404 for author/reviewer/editor. Viewer page renders captured `.json` mail and is reachable only by admin.

---

### B4 — Dev port vs auth/base URL mismatch (MEDIUM, trivial)

**CURRENT.** `package.json` `dev` runs `--port 4000`; `BETTER_AUTH_URL` and `runtimeConfig.public.baseUrl` are `http://localhost:3000`. `auth.ts` trusts both origins so login still works, but absolute links built from `BETTER_AUTH_URL` (e.g. reviewer accept/decline URLs in invitation emails) point at 3000 while the app serves 4000.

**FIX.** Standardize on **one** dev port. Recommended: change the `dev` script to `--port 3000` (matches auth + baseUrl + the Docker app service). If 4000 is preferred, instead set `.env` `BETTER_AUTH_URL=http://localhost:4000` and `NUXT_PUBLIC_BASE_URL=http://localhost:4000`. Pick one; don't keep both.

**Verification.** Reviewer-invitation emails' accept/decline URLs resolve to a running port and complete the accept flow.

---

### B5 — Rotate the committed Resend key (MEDIUM, security)

**CURRENT.** `.env` (gitignored but present in the working tree) contains a live-looking `RESEND_API_KEY` even though `EMAIL_TRANSPORT=local`.

**FIX.** Rotate the key in the Resend dashboard; keep keys only in `.env`/secret manager; confirm `.env` is not in any shared archive/image layer (the Dockerfile uses `env_file`, so ensure built images don't bake it). Add a pre-commit secret scan (e.g. gitleaks) as defense-in-depth.

---

### B6 — Escape user input in email templates (MEDIUM, security)

**CURRENT.** `server/utils/email.ts` builders interpolate names, submission titles, decision reasons, etc. directly into HTML. Harmless while transport is `local` (JSON files), but an HTML/script-injection vector the moment `EMAIL_TRANSPORT=resend` is enabled.

**FIX.** Add a small `escapeHtml()` helper and apply it to every interpolated dynamic value in both `buildBaseEmail` and `buildJournalEmail` paths. (Also consolidate the two divergent HTML builders into one while you're there — see Part B housekeeping.)

**Verification.** Submit a manuscript with a title like `<img src=x onerror=alert(1)>`; confirm the captured mail HTML shows it escaped.

---

### B7 — Add status guard to request-revisions (LOW, consistency)

**CURRENT.** Every other editor decision calls `assertManuscriptStatus(...)`; `server/api/editor/journals/[uuid]/request-revisions.post.ts` does not, so a journal can be pushed to `changes_requested` from any state.

**FIX.** Add an `assertManuscriptStatus` allow-list consistent with the state machine in Part B (e.g. allow from `under_peer_review`, `ready_for_managing_editor_notice`, `reviewed`).

---

### A.1 Suggested sequencing

1. **Hotfix lane (hours):** B1 (boot-migrate + db:check), B2, B4 — unblocks reliable startup for anyone cloning the repo.
2. **Security lane (half-day):** B3 (gate + viewer), B5 (rotate), B6 (escape).
3. **Consistency lane:** B7 + the Part B page/guard alignment.
4. **CI lane:** fresh-DB migrate→seed→check→login smoke; secret scan.

---

## PART B — RECOMMENDED PROCESS FLOW (ROLES & PAGES)

### B.1 The canonical manuscript state machine (single source of truth)

Adopt this as the *one* authoritative diagram; every queue page, guard, and email must key off it. These are the statuses the running code already uses (verified) — the recommendation is to **document and enforce** them, not invent new ones.

```
            ┌─────────┐  editor assigns 2–4 reviewers
 author ───▶│ pending │ ─────────────────────────────▶ in-progress
            └─────────┘                                     │
                                              reviewers submit reviews
                                                     │            │
                                       <2 complete   │            │  ≥2 complete (all done)
                                                     ▼            ▼
                                            under_peer_review   ready_for_managing_editor_notice
                                                     │            │
                                        (more reviews)│            │ managing editor:
                                                     └───▶ ready_for_managing_editor_notice
                                                                  │
                                   ┌──────────────────────────────┼───────────────────────────┐
                                   ▼                              ▼                            ▼
                          send-approval-notice           send-decline-notice         (editor, from `reviewed`)
                                   │                              │                    approve / reject
                                   ▼                              ▼                            │
                          approved / approved_with_comment    declined                 approved / declined
                                   │
                          approve-for-publication (needs ≥2 reviews) ──▶ sets publishedAt, copyEditStatus
                                   │
                                   ▼
                             copy-edit → (REC: published)

   Side transitions:
     any review stage ──(editor request-revisions / reviewer request-change)──▶ changes_requested
     changes_requested ──(author revision upload)──▶ new manuscriptVersion, re-enters review
```

**Status set (enforce, don't extend without updating this doc):**
`pending · in-progress · under_peer_review · ready_for_managing_editor_notice · reviewed · approved · approved_with_comment · declined · changes_requested` (+ `publishedAt`/`copyEditStatus` markers).

**REC — close the two real workflow gaps:**
- **Publication is modeled but never reached.** `approve-for-publication` sets `publishedAt`/`copyEditStatus` but there is no terminal `published` status nor a copy-desk "mark published" action. Decide: either add an explicit `published` status + a Copy Desk action that sets it, or document that "approved + publishedAt" *is* published and surface it that way in the UI. (The original Laravel app had the same gap — this is a chance to fix it, not port it.)
- **Two completion vocabularies.** `reviewed` (consensus path) and `ready_for_managing_editor_notice` (≥2-reviews path) can both represent "reviews done". Pick one as canonical for the editor decision step and make the other an explicit sub-state, so `approve`/`reject` guards are unambiguous.

### B.2 Role → responsibility → guard matrix

| Role key | Acts as | Primary responsibility | Server guard |
|----------|---------|------------------------|--------------|
| `author` | Author | Submit & revise manuscripts, track status | `requireAuthor` / owner checks |
| `associate_editor` | Peer reviewer | Accept assignment, submit structured review | `requireReviewer` |
| `external_reviewer` | Peer reviewer | Same as associate (external) | `requireReviewer` |
| `desk_editor` | Reviewer/triage | Reviewer-class actions | `requireReviewer` |
| `managing_editor` | Editor | Assign reviewers, send approval/decline notices | `requireEditor` |
| `editor_in_chief` | Editor | Final approve/reject, oversight | `requireEditor` |
| `copy_desk_editor` | Production | Copy-edit approved manuscripts, prep publication | `requireEditorOrCopyDesk` |
| `admin` | Superuser | Users, roles, categories, settings, (debug mail) | `requireAdmin` |

**REC — make the Editor-in-Chief vs Managing-Editor split explicit.** Both currently pass `requireEditor`, so any editor can do any editor action. Recommend: Managing Editor owns *assignment* + *notices*; Editor-in-Chief owns *final approve/reject* + *publication approval*. Enforce with `requirePermission` (the permission rows already exist) rather than the coarse `requireEditor`.

### B.3 Per-role page journeys (pages verified to exist → action → endpoint → transition)

Pages and endpoints below are all verified present; the binding is the recommended/intended wiring.

**AUTHOR** — layout `author.vue`, gated by `auth` + `author-onboarding` (forces interest selection first).
1. `/author/interests` → pick research interests (`POST /api/author/interests`).
2. `/author/submit` (wizard) → create submission (`POST /api/files/upload` then `POST /api/journals`) → **pending**; confirmation email + editor notifications captured.
3. `/author/submissions` + `/author/submissions/[id]` → track status; view feedback (`GET …/[id]/feedback`).
4. On `changes_requested`: `/author/submissions/[id]` → upload revision (`POST …/[id]/revision`) → new `manuscriptVersion`, re-enters review; or apply inline change-request resolutions (`POST …/[id]/author-update`).
5. `/author/collections`, `/author/settings`.

**REVIEWER (associate / external / desk)** — layout `reviewer.vue`.
1. Invitation email (captured) → accept/decline landing (`GET /api/reviewer/journals/accept|decline?token=…`) or in-app from `/reviewer/pending`.
2. `/reviewer/pending` → assignments awaiting action; `/reviewer/in-progress` → accepted/started.
3. `/reviewer/journals/[uuid]/review` → read manuscript (watermarked preview via `/api/doc-preview/[uuid]`), submit structured review (`POST /api/reviewer/journals/submit-review`: rating 1–5, six criteria 0–5, recommendation) → triggers `syncJournalReviewStatus` → **under_peer_review** or **ready_for_managing_editor_notice**.
4. Optional: `POST …/request-change` (→ **changes_requested**) or `…/decline-with-comment` (consensus).
5. `/reviewer/reviewed`, `/reviewer/approved`, `/reviewer/declined` — history.

**MANAGING EDITOR / EDITOR (editor + editor_in_chief)** — layout `editor.vue`.
1. `/editor` dashboard → queues mirror the state machine: `/editor/submissions` (pending), `under-peer-review`, `in-progress`, `reviews`, `ready-for-notice`, `revision-requested`, `approved`, `declined`, `copy-desk`.
2. `/editor/journals/[uuid]` → full detail. Actions:
   - Assign reviewers (`POST …/assign-reviewers`, 2–4) → **in-progress** + invitation emails. *(REC: Managing Editor)*
   - Regional/interest suggestions (`GET …/regional-assignment`).
   - From `ready_for_managing_editor_notice`: `send-approval-notice` → **approved/approved_with_comment**; `send-decline-notice` → **declined** (author emailed). *(REC: Managing Editor)*
   - From `reviewed`: `approve`/`reject`; `approve-for-publication` (needs ≥2 reviews) → sets `publishedAt`. *(REC: Editor-in-Chief)*
   - `request-revisions` → **changes_requested** (add B7 guard).

**COPY DESK EDITOR** — `/editor/copy-desk` (via `requireEditorOrCopyDesk`).
- **CURRENT:** can view approved manuscripts. **REC:** add an explicit "mark copy-edited / ready to publish" action that drives `copyEditStatus` → the (recommended) `published` terminal status, closing the publication gap in B.1.

**ADMIN** — layout `admin.vue`, `requireAdmin`.
- `/admin` overview; `/admin/users` + `/admin/users/[id]` (CRUD, role assignment, activation); `/admin/roles` + `/admin/roles/[id]` (RBAC); `/admin/categories` (3-level taxonomy); `/admin/journals`; `/admin/settings`.
- **REC (new):** `/admin/dev-mail` debug viewer from B3 (flag-gated).
- **REC:** port the original app's **admin audit log** screens (japr has the data model gap here vs Laravel) if audit visibility matters for the demo.

### B.4 Page ↔ status alignment rules (enforce)

- Every editor/reviewer queue page must filter by exactly one status from B.1 — no ad-hoc strings. Centralize the labels/colors in one `JournalStatusBadge` map (already exists) and one shared status constant.
- Public pages (`/`, `/journals`, `/journals/[slug]`, `/editorial`) only ever show `approved`/`approved_with_comment`/published manuscripts — confirm the public list/search query filters on that.
- Notifications + emails must use the same status vocabulary as the badges (the original app's biggest inconsistency: `rejected` vs `declined`, `in-progress` vs `in_progress`).

### B.5 Housekeeping carried from the study (fold into the consistency lane)

- Consolidate the two HTML email builders (`buildBaseEmail` vs `buildJournalEmail`) into one.
- Remove dead components flagged in `docs/` (`CategoryTree.vue`, `JournalFilterBar.vue`) or wire them in.
- Implement the unfinished notification-preference dimensions (`frequency`, `weekly_summary` batching).
- Expand `tests/permissions.test.ts` into real integration tests of the state machine (the lifecycle this pass ran by hand is the obvious first automated test).

---

## C. Acceptance criteria for "done"

1. Fresh empty Postgres → `db:migrate → db:seed → db:check` → all 8 seed roles sign in (200). CI enforces this.
2. `DATABASE_URL` unset → tooling fails loudly, never targets a phantom DB.
3. `/api/dev/mail` + viewer: admin-only, flag-gated, renders captured mail in a sandboxed frame; 404 when flag off.
4. One dev port; invitation-email links resolve and complete accept/decline.
5. Resend key rotated; email templates escape user input; secret scan in CI.
6. One documented state machine; every queue/guard/email/badge references it; publication path is either implemented (`published`) or explicitly defined as "approved + publishedAt".
7. An automated test reproduces the full lifecycle (submit → assign → 2 reviews → notice → approved) that this pass verified manually.
