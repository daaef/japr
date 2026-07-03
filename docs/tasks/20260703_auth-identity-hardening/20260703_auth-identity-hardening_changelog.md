# Changelog — Auth, activation & onboarding hardening

## Layer 1 — High-level

Email/password sign-up now goes through better-auth's own API instead of a raw `db.insert`, so every new user — email/password or Google — gets the `author` role and an activation code through one shared code path. Activation codes expire after 30 minutes and lock out after 5 wrong guesses. The sign-in, forgot-password, and activation rate limits now target the paths better-auth and this app actually serve (three of the four were previously no-ops). A brand-new Google author with no research interests now lands on the interests page instead of the empty dashboard. Manuscript submission and reviewer accept/submit-review now re-check the interests/review-policy preconditions server-side, closing the client-only-gate gap. Two pre-existing, unrelated bugs were found and fixed along the way (see below) because both blocked this task's own verification.

## Layer 2 — Low-level

- **`auth.ts`** — added `emailAndPassword.autoSignIn: false` (see "Non-obvious fix" below), `user.additionalFields` for `fullname`/`username`/`country`/`institution`, `advanced.database.generateId` returning `false` for the `user` model, and moved activation-row creation (with `expiresAt`) into `databaseHooks.user.create.after`, gated on `!user.emailVerified` so Google sign-ups don't get one.
- **`server/api/auth/sign-up.post.ts`** — replaced the raw `users`/`accounts`/`activations` insert transaction with `auth.api.signUpEmail(...)`; email/username duplicate pre-checks kept (better-auth has no knowledge of `username`). Fetches the activation row the hook just created to send the registration/activation emails and report `emailDelivered`, preserving the existing response shape.
- **`server/db/schema/users.ts`**, migrations `0009_demonic_human_robot.sql` — added `activations.expiresAt` (nullable timestamp) and `activations.attempts` (int, default 0).
- **`server/api/auth/activate.post.ts`** — looks up the activation row by email alone (not email+code) so a wrong guess still finds the row to increment; rejects with a distinct message if `expiresAt` is null/past or `attempts >= 5`; increments `attempts` via `WHERE attempts < 5` so concurrent wrong guesses can't race past the limit.
- **`server/api/auth/resend-activation.post.ts`** — resets `expiresAt`/`attempts` on resend (previously a resent code inherited a stale expiry or an already-exhausted attempt counter).
- **`server/middleware/rate-limit.ts`** — corrected `/api/auth/sign-in` → `/api/auth/sign-in/email`, `/api/auth/forgot-password` → `/api/auth/request-password-reset` (the paths better-auth actually mounts under `[...all]`), added `/api/auth/activate` and `/api/auth/resend-activation`.
- **`app/pages/auth/login.vue`** — Google sign-in's `callbackURL` fallback changed from hardcoded `/author` to `/auth/login`; the page's existing `guest` middleware already redirects an authenticated user via `resolveWorkspacePath(...)`, so this reuses that instead of adding new client logic.
- **`server/api/journals/index.post.ts`** — rejects with 403 if the caller has zero `userInterests` rows.
- **`server/api/reviewer/journals/accept.post.ts`**, **`submit-review.post.ts`** — reject with 403 if `!session.appUser.reviewPolicyAccepted`.
- **`scripts/remediate-roleless-users.ts`** (new, `pnpm db:remediate-roleless-users [--apply]`) — dry-run by default; lists users with zero role rows and only assigns `author` when re-run with `--apply`.

## Non-obvious fixes found during implementation

- **`autoSignIn: false` was required, not optional.** Without it, `signUpEmail` tries to auto-create a session right after creating the user. That hits the existing `session.create.before` hook, which rejects any unverified user — so *every* fresh registration would have thrown `FORBIDDEN` back to the caller (even though the account was actually created), because this adapter runs without a real DB transaction (`drizzleAdapter`'s `transaction` option is off, confirmed by reading the adapter source) so nothing would have rolled back to mask it. Traced through better-auth's source (`sign-up.mjs`, `internal-adapter.mjs`, `with-hooks.mjs`) rather than assumed.
- **`generateId: false` for the `user` model was required.** `users.id` is a strict Postgres `uuid` column; better-auth's default id generator produces a nanoid-style string, which fails the insert (`invalid input syntax for type uuid`). This was **not new** — it affects every user creation through better-auth's adapter, including Google OAuth, and predates this task. It surfaced because this task is the first time email/password sign-up actually exercised that code path (it previously bypassed the adapter entirely with a raw insert). Migration `0007_wet_iron_lad` had already converted `accounts`/`verifications`/`sessions` ids to plain `text` for the same reason; `users.id` was missed. Fixed narrowly via a per-model `generateId` function rather than changing `users.id`'s type, since that column is a foreign key target for nearly every table in the schema.
- **`server/db/migrations/0008_admin_audit_logs.sql` existed on disk but was never registered in `_journal.json`** — the same class of bug as a previously-fixed login-breaking migration drift (see memory). `db:migrate` had never actually created the `admin_audit_logs` table, so every `/api/admin/audit/*` route would 500. Fixed by generating it as a proper, journal-registered migration (now `0008_good_madrox.sql`) before generating this task's own `0009` migration, and added both to `server/db/check.ts`'s required-objects list so a future drift like this fails loudly at boot instead of silently.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (26/26) — all pass.
- `pnpm db:migrate` + `pnpm db:check` — clean against the local dev DB.
- Live end-to-end against `nuxt dev` + the docker-compose Postgres:
  - Email/password registration → `roles = ['author']`, activation row created with `expiresAt`/`attempts: 0`, activation email sent, `emailDelivered: true`.
  - Wrong activation code → 400 "Invalid activation code.", `attempts` incremented in the DB.
  - Correct activation code → account activated; login now succeeds and returns the `additionalFields` (fullname/username/country/institution) correctly.
  - Login before activation → 403 "Please activate your account before signing in." (unchanged regression).
  - Duplicate email / duplicate username at sign-up → 409s (unchanged regression).
  - Existing seeded user (`author@example.com`) login unaffected.
  - `POST /api/journals` with zero interests → 403; after adding an interest via `/api/author/interests` → succeeds.
  - `POST /api/reviewer/journals/accept` with `reviewPolicyAccepted = false` → 403 (verified by temporarily flipping a seeded user's flag, then restoring it).
  - Expired activation code (`expiresAt` forced into the past) → distinct 400 "This activation code has expired."
  - Rate limiter on `/api/auth/sign-in/email` confirmed blocking (429) once the per-IP bucket filled.
  - All test users/data created during verification were deleted afterward.

## Untested paths

- Live Vercel deploy of the corrected rate-limiter paths (per the plan — local dev can't fully exercise better-auth's Vercel-specific rate-limit backend).
- `scripts/remediate-roleless-users.ts` against real data — must be run with a dry run reviewed by an operator first, per the plan; not run against this dev DB's seed data since none of the seeded users are roleless.
