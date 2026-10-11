# Handoff — JAPR session, 2026-10-10/11

Written for a new agent (Devin) picking this up. Everything below is grounded in the actual
repo state as of this file's creation — verify anything you rely on rather than trusting this
doc blindly, same discipline this project's own `CLAUDE.md` demands of every session.

## 0. Do this first — nothing below is committed or pushed

**Every change described in this doc is sitting uncommitted in the working tree right now.**
Only two commits from this work session actually landed:

- `f0e664e` — desk_editor/copy_desk_editor role collapse + DOCX standardization (migration 0020)
- `01e9025` — account-cleanup script + first-run-admin-setup planning doc

Everything else — the Africa-only country restriction, the automatic 2-of-3 reviewer
consensus, the editorial board admin feature, and two pre-existing bug fixes — is **uncommitted,
unpushed, and the last full `typecheck`/`lint`/`test`/`build` pass found 2 real TypeScript
errors** (both now fixed in source, but **not yet re-verified** — the user had not re-run the
sequence when this handoff was written). Run `git status --short` before touching anything else.

**Before any new feature work:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
If that's clean, commit, then run migrations against production **before** pushing (see §4 — the
new code assumes schema that doesn't exist in prod yet):
```bash
git add -A && git commit -m "..."
pnpm db:migrate
pnpm db:seed
git push
```
`.env`'s `DATABASE_URL` points directly at the **production** Neon database — there is no
separate dev database in this setup. Treat every local DB command as a production action.

## 1. Stack

Nuxt 4 (Vue) + Nitro server routes, Drizzle ORM over Postgres (Neon in production), better-auth
for auth/session/OAuth, Vercel Blob for manuscript storage, Pinia, Tailwind + Nuxt UI. Tests via
`tsx --test` (`pnpm test`). Deployed on Vercel.

Read `/Users/aef/Projects/japr/CLAUDE.md` and `~/.claude/CLAUDE.md` (if available to you) before
editing anything under `server/api/auth/**`, `server/db/schema/roles.ts`, role/permission
assignment, `server/api/reviewer/**`/`server/api/manuscripts/**`-equivalent paths
(`server/api/journals/**`), upload/storage code, or anything touching PII — this repo's own
convention locks those to a "confirm the approach before writing code" discipline by default.

## 2. What this session actually did (all uncommitted except the two commits above)

Full detail is in `docs/tasks/` — each item below has its own folder with `problem.md`/`plan.md`/
`changelog.md`. Read those before touching the related code; they contain the "why," not just
the "what."

| Task folder | What it did |
|---|---|
| `20261010_collapse-desk-editor-role` | Retired `desk_editor` as a role; collapsed into `copy_desk_editor`. Migration 0020. |
| `20261010_docx-standardization` *(no folder — see README)* | Dropped legacy `.doc` upload support; DOCX is the standard, PDF auto-conversion was explicitly rejected as a direction (cost/fidelity trade-off) in favor of this. |
| `20261011_first-run-admin-setup` | **Design only, not built.** A one-time "create the first admin" screen for when zero admin-role users exist, replacing the hardcoded seeded admin. See its `plan.md` for the full design (advisory-locked bootstrap endpoint, `needsSetup()` cache, new `/auth/setup` route). |
| (no folder, see README) `africa-only-manuscript-country` | A manuscript's country of origin must be African; the author's own profile country stays global. New `regions.isAfrican` flag, migration 0021, server-side enforcement in both journal create/update endpoints (previously accepted any string). |
| `20261011_two-of-three-auto-resolve` | **Significant behavior change.** A manuscript now auto-approves/declines the instant 2 of 3 reviewers agree — fully automatic, no editor click, confirmed explicitly by the stakeholder over the alternative (just unlocking the editor's decision early). Partially supersedes the 2026-07-13 `review-consensus` task for this one case. New `getEarlyConsensus`/`finalizeByReviewerConsensus` in `server/utils/journalWorkflow.ts`. |
| `20261011_editorial-board-admin` | Editorial board moved from a hardcoded file to an admin-editable table (`/admin/editorial-board`). Sections are free text (not fixed roles) — a new section needs no code change. Access: `admin` **and** `copy_desk_editor` (confirmed explicitly — "desk editor can do this too" — via a new `manage-editorial-board` permission, not a hardcoded role check). Migration 0022. |

**Two pre-existing bugs found and fixed** (neither introduced this session — confirmed via
`git blame` to prior commits):
- `server/utils/permissions.ts` — `getUsersWithPermission()` referenced the `users` table
  without importing it. This was **live-broken in production**: it's called from
  `notifyAssignersOfReviewStart` on every manuscript submission, silently crashing into a
  `console.error` that swallows the failure. Managing editors/copy desk editors have likely never
  gotten the "ready for reviewer assignment" notification. Fixed by adding the import — **not
  independently re-verified beyond the typecheck passing**; worth a manual check that the
  notification now actually arrives.
- `server/db/schema/users.ts` — the `notificationPreferences` jsonb column had its own
  hand-written type literal that drifted from `shared/validation/notifications.ts`'s real type
  (missing the `ping` key, added in a prior `ping-nudge-system` task). Fixed by having the schema
  import and reuse the real `NotificationPreferences` type instead of a second hardcoded copy.

## 3. A live security situation — not fully resolved, explicit stakeholder decisions made

During this session, `pnpm db:seed` was run against production before anyone realized
`server/db/seeds/system.ts`'s `defaultUsers` loop has **no production guard** and creates
accounts with plaintext password `"password"`. Current state:

- `editor@example.com`, `copydesk@example.com`, `external@example.com` — zero activity, safe to
  delete, **not yet confirmed deleted**.
- `admin@example.com`, `author@example.com` (9 real manuscripts), `associate@example.com` (2
  reviewer assignments), `managing@example.com` (1 editorial comment) — **still have the known
  password `"password"` live in production.** The stakeholder explicitly declined to rotate
  these now ("when we clear the database users will create better accounts... with the necessary
  verifications in place") — this is a deliberate, informed decision, not an oversight. Don't
  silently "fix" this without the stakeholder's go-ahead.
- `admin@example.com` is also the real admin identity (`.env`'s `DEFAULT_ADMIN_EMAIL`) — **do not
  delete it.** There's a separate confirmed bug where `DEFAULT_ADMIN_PASSWORD` never actually
  takes effect (the hardcoded `defaultUsers` loop creates the account first, so the env-based
  block's `if (!admin)` check is always false) — **not fixed, flagged only.**
- `scripts/delete-users.ts` exists for cleanup: dry-run by default, reports cascade impact before
  deleting, `--apply` to actually delete. Every FK to `users.id` in the schema is confirmed
  `cascade` or `set null` (checked exhaustively) — any account is safely deletable.
- The seed-script production guard itself (stop `defaultUsers` from running when
  `VERCEL_ENV=production`) was proposed and **explicitly deferred by the stakeholder** ("don't
  worry about that for now"). It will bite again on every future `pnpm db:seed` run until fixed.

## 4. Outstanding work, roughly in the order it was being tackled

1. **Finish verification and ship today's uncommitted work** (§0) — this blocks everything else
   landing in production.
2. **Book Review Editor role** — not built at all (no schema, no permissions, no UI). Needs the
   stakeholder's input on: what permissions the role actually needs, whether "book review"
   becomes a manuscript category, the person's name. The editorial-board-admin feature (§2) makes
   the public-facing "own section" part trivial once the role exists — just add the person with
   `section: "Book Review Editors"` through `/admin/editorial-board`, no code change.
3. **Submission-form freeze / duplicate-submission race** — not fixed. Two real issues:
   `server/db/client.ts`'s pg `Pool` has no `connectionTimeoutMillis`/`idleTimeoutMillis`, and
   `server/utils/fileOwnership.ts`'s `markFileAttached` does an unconditional `UPDATE` with no
   `WHERE status = 'pending'` guard — a timeout-then-retry can create a duplicate manuscript.
   Fix the race before adding any client-side retry logic, not after.
4. **Copy Desk Editor still can't create user accounts** — `server/api/users/index.post.ts`'s
   `requireAdmin` only allows the literal `admin` role. This is explicitly asked for in the
   original stakeholder notes ("desk editor can create accounts if admin is unavailable") and
   remains unmet. Same permission-based pattern as `manage-editorial-board` would fit here.
5. **First-run admin setup** — design is written (`docs/tasks/20261011_first-run-admin-setup/`),
   nothing implemented. This is the real fix for the account-exposure situation in §3 — until
   it exists, there's no production-safe way to bootstrap a first admin.
6. **Seed-script production guard** — deferred by the stakeholder, not forgotten. Revisit when
   convenient; every reseed until then risks recreating the exposed dev accounts.
7. Minor, non-blocking: the editorial board nav link (added to `app/layouts/editor.vue`) briefly
   switches a `copy_desk_editor` into the admin layout/sidebar (which lists sections they can't
   access) before switching back on their next navigation. Cosmetic, documented, not fixed.

## 5. Reference material already in the repo

- `docs/tasks/README.md` — the full task index/roadmap, more granular than this doc.
- `docs/PRESENTATION_READINESS_CHECKLIST.md` and the interactive version at
  `https://claude.ai/artifact/HC2ApKDjNHNjcW589ThW8B` — maps every item from the original
  stakeholder meeting notes to its actual current status (ready/partial/not built), written for
  manual QA before a stakeholder demo. Useful as a test plan, not just documentation.
- `scripts/delete-users.ts` — the account-cleanup script described in §3.

## 6. Working conventions this session followed (worth keeping)

- Every non-trivial change got its own `docs/tasks/<date>_<slug>/problem.md` (+ `plan.md` for
  anything planned ahead of implementation, + `changelog.md` once it landed), indexed in
  `docs/tasks/README.md`. Smaller fixes got a one-line "no folder" entry in the same README
  instead of a full folder — use judgment on which fits.
- Migrations are hand-written SQL in `server/db/migrations/NNNN_slug.sql`, manually registered in
  `server/db/migrations/meta/_journal.json` (not always produced by `drizzle-kit generate` —
  check the existing files' style before adding one).
- When a change could be read two ways with materially different consequences (e.g., "unlock the
  editor's decision" vs. "fully automatic, no editor"), the right move was to stop and ask rather
  than infer — several features this session turned out to need the more consequential
  interpretation, confirmed explicitly rather than assumed.
