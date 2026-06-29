# Solution — Vercel INVALID_ORIGIN

## Proposed approach

1. **Vercel env vars** — Set `BETTER_AUTH_URL=https://japr.vercel.app`, `BETTER_AUTH_SECRET`, `NUXT_PUBLIC_BASE_URL`, and `DATABASE_URL` in the Vercel dashboard; redeploy.
2. **Harden `auth.ts`** — Derive production URL from `VERCEL_URL` when unset; use Better Auth `baseURL.allowedHosts` for `japr.vercel.app` and `*.vercel.app`; build `trustedOrigins` from `BETTER_AUTH_URL` + `BETTER_AUTH_TRUSTED_ORIGINS`; keep localhost origins only outside production.

## Alternatives rejected

- **Trust all origins in production** — Rejected; opens CSRF surface; Better Auth allowlist is the correct model.
- **Client-only baseURL fix** — Rejected; origin validation is server-side in Better Auth handler.

## Performance impact

Neutral — config computed once at module load.

## Performance delta

Not measurable; no rendering, query, or socket changes.

## Trade-offs

- `japr.vercel.app` is hardcoded in `allowedHosts`; custom domains require `BETTER_AUTH_TRUSTED_ORIGINS` or a follow-up config change.
- Preview deploys trust all `*.vercel.app` hosts (standard Vercel pattern).

## Dead code audit

None — replaces inline localhost-only `trustedOrigins` array with env-driven builder.
