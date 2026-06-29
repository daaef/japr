# Problem — Vercel INVALID_ORIGIN

## Root cause

Better Auth rejects auth requests when the browser `Origin` (`https://japr.vercel.app`) is not listed in `trustedOrigins`; production Vercel env still defaults to localhost URLs.

## Symptoms

- Login/sign-up on `https://japr.vercel.app` returns `{ "message": "Invalid origin", "code": "INVALID_ORIGIN" }`
- Password-reset and OAuth flows fail for the same reason

## Affected files / functions

- [`auth.ts`](../../../auth.ts) lines 8–22 — `baseURL` and `trustedOrigins`
- Vercel project environment variables (not in repo)

## Blast radius

- All Better Auth routes under `/api/auth/*`
- Client auth via [`lib/auth-client.ts`](../../../lib/auth-client.ts)
- Absolute links using `BETTER_AUTH_URL` or `NUXT_PUBLIC_BASE_URL`

## Constraints

- Must not weaken auth hooks (activation gate, inactive user block)
- Local dev at `http://localhost:3000` must keep working
- No new npm dependencies

## Edge cases

- Vercel preview deployments (`*.vercel.app` subdomains)
- Custom domain added later via `BETTER_AUTH_TRUSTED_ORIGINS`
- Google OAuth redirect URIs must match production URL
