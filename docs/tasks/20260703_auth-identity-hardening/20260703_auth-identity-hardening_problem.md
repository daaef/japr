# Problem — Registration, activation & onboarding enforcement are inconsistent and partly bypassable

## Root cause

The only registration form in the app (`app/pages/auth/register.vue`) posts to a hand-rolled endpoint, `server/api/auth/sign-up.post.ts:34-62`, which creates the user with a raw `db.insert(users)` inside its own transaction instead of calling better-auth's own sign-up API. The automatic `author` role assignment lives in a better-auth hook, `auth.ts:87-110` (`databaseHooks.user.create.after`), which only fires when better-auth's own adapter creates the row. Google OAuth goes through that adapter and gets a role; email/password sign-up does not, and never will until it goes through the same door.

Two smaller gaps compound this: the `activations` table (`server/db/schema/users.ts:86-94`) has no expiry column and no attempt counter, so a 6-digit activation code is valid forever with unlimited guesses; and two of the three configured entries in `server/middleware/rate-limit.ts:3-7` (sign-in, forgot-password) target paths better-auth doesn't actually mount (the real paths are `/sign-in/email` and `/request-password-reset`), so only the sign-up limiter is doing anything today.

Separately, two "gates" that should block an action server-side only exist as client-side route guards: the research-interests onboarding check (`app/middleware/author-onboarding.ts`) and the reviewer review-policy check (`app/middleware/auth.ts:14-26`). Neither is re-verified by the API endpoint it's meant to protect.

## Symptoms

- Every user who registers through the visible sign-up form ends up with `roles = []` permanently and no reachable dashboard.
- A 6-digit activation code can be brute-forced with no cooldown and never expires.
- The sign-in and forgot-password rate limits configured in the codebase do not actually apply to any real request path.
- A brand-new Google-registered author is sent to `/author` instead of `/author/interests`, skipping onboarding.
- `POST /api/journals` can be called directly without the caller ever having selected research interests; the reviewer accept/submit-review endpoints can be called without the caller ever having accepted the review policy.

## Affected files / functions

- `server/api/auth/sign-up.post.ts` — raw insert, bypasses better-auth
- `auth.ts` — `databaseHooks.user.create.after` (role assignment), `databaseHooks.session.create.before` (active/verified enforcement — keep as-is)
- `server/db/schema/users.ts` — `activations` table (needs `expiresAt`, `attempts`)
- `server/api/auth/activate.post.ts`, `server/api/auth/resend-activation.post.ts`
- `server/middleware/rate-limit.ts`
- `app/pages/auth/login.vue` (Google callback redirect)
- `app/utils/workspace.ts` (`resolveWorkspacePath`)
- `server/api/journals/index.post.ts` (interests gate), `server/api/reviewer/journals/accept.post.ts`, `server/api/reviewer/journals/submit-review.post.ts` (review-policy gate)

## Blast radius

Every new user registration and login, on every environment. This is the highest-blast-radius fix in the roadmap — it sits upstream of onboarding, dashboard routing, and every role-gated feature.

## Constraints

- Must not disrupt already-activated, already-logged-in users or their sessions.
- OAuth sign-up must keep working exactly as it does today — do not double-assign roles.
- Local/Docker dev flow (no Vercel-specific env vars) must keep working unchanged.
- Activation UX (6-digit code, same delivery email) stays the same; only expiry and attempt-limiting are added.

## Edge cases

- Users who registered before this ships and already have `roles = []` are not retroactively fixed by a schema migration alone — they need an explicit, human-reviewed one-time remediation (see plan step 5), not a guessed default role.
- Activation attempted after the code has expired must return a clear, distinct message ("code expired, request a new one"), not a generic failure.
- The `attempts` counter must be incremented atomically with the validation check to prevent a race that lets concurrent requests bypass the limit.
- Existing `activations` rows created before the migration will have `expiresAt = NULL`; treat `NULL` as already-expired rather than "no expiry," so no pre-existing unconsumed code becomes silently permanent.
