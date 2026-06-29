# Plan — Vercel INVALID_ORIGIN

## Steps

### 1. Vercel environment variables
Set Production (and Preview) env in Vercel dashboard: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `NUXT_PUBLIC_BASE_URL`, `DATABASE_URL`, email vars as needed. Redeploy.
**Complexity:** trivial  
**AC:** Vercel deployment shows correct env vars; redeploy completes.

### 2. Harden [`auth.ts`](../../../auth.ts)
Add `buildBaseURL()` and `buildTrustedOrigins()`; use `allowedHosts` when `VERCEL_URL` is set; localhost origins only in dev.
**Complexity:** low  
**AC:** `trustedOrigins` includes production origin; no localhost in production config path.

### 3. Update [`README.md`](../../../README.md)
Add Vercel deployment checklist; fix dev port comment to 3000.
**Complexity:** trivial  
**AC:** README lists required Vercel env vars and auth URL rule.

### 4. Verify production
Confirm auth endpoint accepts `https://japr.vercel.app` origin after deploy.
**Complexity:** low  
**AC:** No `INVALID_ORIGIN` on sign-in request (post-deploy with env + code).

## Untested paths

- Google OAuth callback on production (only if OAuth env vars set)
- Custom domain not in `allowedHosts`

## Regression checklist

- [`server/api/auth/[...all].ts`](../../../server/api/auth/[...all].ts) — auth handler
- [`app/pages/auth/login.vue`](../../../app/pages/auth/login.vue) — email sign-in
- [`app/pages/auth/forgot-password.vue`](../../../app/pages/auth/forgot-password.vue) — reset link base URL
- Local `pnpm dev` at `http://localhost:3000`

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new any types or unsafe assertions
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline N/A (config-only change)
