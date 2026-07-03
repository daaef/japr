# Plan — Auth, activation & onboarding hardening

## Steps

1. **Confirm current `auth.ts` hook behavior before touching it** — read `auth.ts:80-140` in full to confirm exactly what `databaseHooks.user.create.after` and `session.create.before` do today, and whether activation-row creation already lives inside a hook or only in `sign-up.post.ts`. Complexity: trivial. AC: written confirmation of the current hook contract before step 3 starts — this plan was written against audit summaries, not a fresh line-by-line read of every file.
2. **Migration — add `expiresAt` (timestamp, nullable) and `attempts` (integer, default 0) to `activations`** — `server/db/migrations/`, `server/db/schema/users.ts`. Complexity: low. AC: `pnpm db:generate` produces a clean migration; `pnpm db:migrate` applies without error against existing data; existing rows read as expired (`NULL` expiresAt treated as expired in application code, not backfilled with a guessed timestamp).
3. **Route email/password sign-up through better-auth's own API** — replace the raw `db.insert(users)` transaction in `server/api/auth/sign-up.post.ts` with a call to better-auth's server-side sign-up call, so `user.create.after` fires unconditionally for both sign-up methods; move activation-code creation (with `expiresAt = now + 30m`) into that same hook path if step 1 finds it isn't already there. Complexity: medium. AC: a fresh email/password registration ends up with `roles = ['author']` in the database with no manual step.
4. **Enforce expiry + attempt limit on activation** — `server/api/auth/activate.post.ts`: reject if `now > expiresAt` (distinct error message) or `attempts >= 5`; increment `attempts` on every failed check. Complexity: low. AC: an expired or over-attempted code is rejected with a specific message; a valid code within the window still succeeds.
5. **One-time remediation for pre-existing roleless users** — a script (not an automatic migration side-effect) that lists any `users` row with zero `userRoles` and assigns `author` by default, run manually once by an operator after reviewing the list. Complexity: low. AC: script output is reviewed by a human before being applied; no user is silently reassigned.
6. **Fix the rate-limiter path table** — `server/middleware/rate-limit.ts`: correct the sign-in and forgot-password entries to the paths better-auth actually mounts (`/sign-in/email`, `/request-password-reset`), and add `/api/auth/activate` and `/api/auth/resend-activation`. Complexity: low. AC: hitting each of the four routes past its limit returns a 429, verified locally by firing N+1 requests.
7. **Fix the Google-login redirect** — `app/pages/auth/login.vue`: replace the hardcoded `callbackURL: '/author'` with the same `resolveWorkspacePath(...)` call the email/password path uses. Complexity: trivial. AC: a brand-new Google author with no interests lands on `/author/interests`, not `/author`.
8. **Server-side enforcement for the two client-only gates** — `server/api/journals/index.post.ts`: reject manuscript creation if the caller has zero `userInterests`. `server/api/reviewer/journals/accept.post.ts` and `submit-review.post.ts`: reject if `reviewPolicyAccepted` is false. Complexity: low. AC: calling either endpoint directly (bypassing the SPA) without satisfying the precondition returns a 403 with a clear message.

## Untested paths

- Live Vercel deploy of the corrected rate-limiter paths (local dev can't fully exercise better-auth's Vercel-specific rate-limit backend).
- The one-time remediation script against real production data — must be dry-run and reviewed by an operator before being applied.

## Regression checklist

- Email/password registration → user ends up with `roles = ['author']`, receives activation email, activates, logs in, lands on `/author/interests`.
- Google OAuth registration → unchanged behavior, still gets the `author` role, now also lands on `/author/interests` if no interests exist yet.
- Activation with a valid, unexpired code still succeeds.
- Activation with an expired code, or after 5 failed attempts, is rejected with a specific message.
- `POST /api/journals` without interests → 403. With interests → unchanged success path.
- `POST /api/reviewer/journals/accept` / `submit-review` without policy acceptance → 403. With acceptance → unchanged success path.
- Existing activated users can still log in without any change in behavior.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (old raw-insert sign-up path fully removed, not left dormant)
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified (role constants, redirect logic)
- [ ] Remediation script output reviewed by a human before running against production
