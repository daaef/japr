# Solution — Auth, activation & onboarding hardening

## Proposed approach

1. Re-read `auth.ts`'s hook definitions in full before changing anything, since this plan was written from audit summaries rather than a fresh line-by-line read.
2. Add `expiresAt`/`attempts` to `activations` via a normal additive migration; treat `NULL` as expired in application code rather than backfilling a guessed value.
3. Replace the raw-insert sign-up handler with a call into better-auth's own sign-up API so every creation path shares one hook.
4. Add expiry + attempt-limit checks to `activate.post.ts`, and extend `rate-limit.ts` to cover the two dead entries plus the two new activation routes.
5. Swap the Google-login hardcoded redirect for the existing `resolveWorkspacePath` helper — no new routing logic needed, just calling the one that already exists.
6. Add a single precondition check to each of the three endpoints identified (`journals/index.post.ts`, reviewer `accept`/`submit-review`) rather than building a generic "gate" abstraction — three call sites don't justify a new middleware layer yet.

## Alternatives rejected

- **Auto-assigning a role to existing roleless users via the migration itself** — rejected; silently granting `author` to accounts nobody has reviewed risks granting access nobody intended. A human-reviewed script is safer.
- **A generic server-side "gate" middleware for onboarding/policy checks** — rejected for now; three call sites isn't enough to justify a new abstraction layer. Revisit if a fourth gated action appears.
- **Shortening the activation code or switching to a magic link** — out of scope; the ask is to make the existing code safe, not redesign the activation UX.

## Performance impact

Negligible — one additional indexed lookup per activation attempt (attempts counter), no change to the hot login/session path.

## Trade-offs

Consolidating sign-up onto better-auth's API means any custom fields currently written directly in `sign-up.post.ts` (if step 1 finds any) need an explicit post-creation update call instead of being set in the same insert — slightly more code, but removes the entire class of "two ways to create a user" bugs going forward.

## Dead code audit

The raw `db.insert(users)` / `db.insert(accounts)` / `db.insert(activations)` transaction in `sign-up.post.ts` should be fully deleted, not left behind as an unused code path.
