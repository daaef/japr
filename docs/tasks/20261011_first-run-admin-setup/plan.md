# Plan: First-run admin setup

## Design

**Trigger condition:** zero `userRoles` rows joined to the `admin` role. Exposed via a new
lightweight endpoint, `GET /api/auth/setup-status` → `{ needsSetup: boolean }`.

**Caching:** an in-memory flag (module-level, mirroring the rate-limiter's in-memory `Map`
pattern in `server/middleware/rate-limit.ts:3`) that starts `true` and flips permanently to
`false` the moment setup completes or the check ever finds an admin. Avoids querying on every
page load forever — once real, it's cheap forever after. Not consulted from the hot
`server/middleware/auth.ts` request path (confirmed in research: that file has no
`requiredRoles` concept and runs on every `/api/` call — adding a DB check there would be a
cost paid on every request indefinitely). Consulted only from specific entry points instead.

**Where it's consulted:**
- `app/middleware/guest.ts` (already gates `/auth/login` and `/auth/register` — confirmed at
  `app/pages/auth/register.vue:7-10`): if `needsSetup`, redirect to `/auth/setup` instead of the
  normal guest page.
- Root `/` (`app/pages/index.vue` or its layout): same redirect, so a first-time visitor lands on
  setup rather than a normal homepage.

**New route:** `/auth/setup` (`app/pages/auth/setup.vue`), gated by `middleware: ['guest']` plus
its own `needsSetup` check — if setup is already done, redirect to `/auth/login` immediately (no
dead page left reachable after the fact).

**Form fields** (mirrors `app/pages/auth/register.vue`'s vee-validate + `UFormField` +
`extractApiErrorMessage` pattern): fullname, username, email, password, confirmPassword. Omits
`country`/`institution` from `signUpSchema` — confirmed nullable in `server/db/schema/users.ts`
(no `.notNull()` on either), so they're not required for an admin account. New schema
`setupAdminSchema` alongside `signUpSchema` in `shared/validation/auth.ts`.

**New endpoint:** `POST /api/auth/setup-admin` (not a reuse of `/api/auth/sign-up` — role
assignment and the zero-admin guard differ enough to warrant a separate endpoint, per the
research). Must re-check the zero-admin condition authoritatively at submission time, not just
trust the cached flag (which could be stale, or two requests could race in the gap between
check and insert).

**Concurrency — this needs a real lock, not just a transaction.** Postgres's default read-
committed isolation does not stop two concurrent requests from both seeing "zero admins" and
both inserting. Use `pg_advisory_xact_lock(<fixed key>)` at the start of the endpoint's
transaction, so the second concurrent request blocks until the first commits, then re-reads zero
admins as false and rejects cleanly (409 "Setup already completed"). This is the simplest correct
fix for a one-time, low-traffic operation — no new dependency, just one more line in the existing
`db.transaction` pattern already used in `server/api/users/index.post.ts:20-52`.

**On success:** insert the `users` row (`emailVerified: true`, no activation flow — mirrors how
`server/api/users/index.post.ts:21-32` creates admin-created users, not the normal sign-up
activation flow), insert the matching `accounts` credential row (mirrors lines 36-42 of that
same file), raw-insert the `admin` role into `userRoles` (no shared helper exists today — both
existing call sites in `auth.ts:136-141` and `users/index.post.ts:44-49` do raw inserts; this is
an optional opportunity to introduce one, not required). Flip the in-memory cache to `false`.
Redirect to `/auth/login` with a success message — simplest option; does not require handling
session creation inside this custom endpoint.

**Rate limiting:** add one entry to `server/middleware/rate-limit.ts`'s per-path map (line ~44-68
today), matching the existing `/api/auth/sign-up: {max: 3, windowMs: 60_000}` shape. This endpoint
can only ever succeed once in the application's lifetime, so a tight limit has no legitimate-user
cost.

## Files to touch (when implementing)

| File | Change |
|---|---|
| `server/utils/setupStatus.ts` (new) | `needsSetup()` with the in-memory cache + DB fallback check |
| `server/api/auth/setup-status.get.ts` (new) | Exposes `needsSetup()` to the client |
| `server/api/auth/setup-admin.post.ts` (new) | The guarded, advisory-locked admin-creation endpoint |
| `shared/validation/auth.ts` | Add `setupAdminSchema` |
| `app/pages/auth/setup.vue` (new) | The setup form, mirroring `register.vue`'s structure |
| `app/middleware/guest.ts` | Redirect to `/auth/setup` when `needsSetup()` is true |
| `app/pages/index.vue` (or its layout) | Same redirect for first-time root visits |
| `server/middleware/rate-limit.ts` | New path entry for `/api/auth/setup-admin` |

## Open questions for the developer when implementation starts

- Should the new admin be auto-logged-in after setup, or redirected to login (this plan defaults
  to the simpler redirect-to-login)?
- Should a shared `assignRole(userId, roleName)` helper be introduced here (cleaning up the
  duplicated raw-insert pattern in `auth.ts` and `users/index.post.ts`), or kept scoped to just
  this new endpoint for now?
- `server/api/auth/**` and `auth.ts` are `learn`-mode locked by default per this repo's
  `CLAUDE.md` — confirm `mode: ship` (or work through it in learn mode) when ready to build.
