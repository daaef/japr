# Changelog — Vercel INVALID_ORIGIN

## Layer 1 — High-level

Better Auth on Vercel now derives trusted origins from production env and Vercel host patterns instead of hardcoded localhost URLs. Deployments at `japr.vercel.app` and `*.vercel.app` preview URLs pass origin validation when `BETTER_AUTH_URL` / `VERCEL_URL` are set; local dev still trusts localhost. README documents required Vercel environment variables.

## Layer 2 — File changes

| File | Range | Before | After | Why |
|---|---|---|---|---|
| [`auth.ts`](../../../auth.ts) | 8–58 | Static `baseURL` string and localhost-only `trustedOrigins` | `buildBaseURL()` with Vercel `allowedHosts`; `buildTrustedOrigins()` from `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, localhost only in dev | Prevents `INVALID_ORIGIN` on production and preview deploys |
| [`README.md`](../../../README.md) | Environment + new Vercel section | No deployment env checklist; dev port comment 4000 | Vercel env table, auth URL rule, OAuth note; dev port 3000 | Operators can configure Vercel without guessing |
| Task docs | `docs/tasks/20260628_vercel-auth-origin/` | — | problem, solution, plan, changelog | Engineering protocol |

## Vercel env (operator action)

Set on Vercel dashboard and redeploy: `BETTER_AUTH_URL=https://japr.vercel.app`, `BETTER_AUTH_SECRET`, `NUXT_PUBLIC_BASE_URL=https://japr.vercel.app`, `DATABASE_URL`. Code provides `VERCEL_URL` fallback and `*.vercel.app` allowlist when env is incomplete.

## Verification

- `pnpm typecheck` — pass
- `POST https://japr.vercel.app/api/auth/sign-in/email` with `Origin: https://japr.vercel.app` — `401 INVALID_EMAIL_OR_PASSWORD` (origin accepted; pre-deploy baseline)
- Post-deploy: confirm login UI no longer shows `INVALID_ORIGIN`
