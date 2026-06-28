# Plan — Mail viewer for authenticated users

## Steps

### 1. Runtime config — `nuxt.config.ts`
Add `public.enableMailViewer: false` (overridden by `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`).
**Complexity:** trivial  
**AC:** `useRuntimeConfig().public.enableMailViewer` is `true` when env is set.

### 2. Access guard — `server/utils/devMail.ts`
Gate on `public.enableMailViewer === true` only; replace `requireAdmin` with `requireSession`.
**Complexity:** low  
**AC:** Authenticated non-admin GET `/api/dev/mail` returns 200 when flag on; 404 when off; 401 when logged out.

### 3. Mail inbox page — `app/pages/mail/index.vue`
Public layout, auth middleware, split-pane inbox (subject / to / time list + sandboxed iframe detail), refresh, disabled and empty states.
**Complexity:** medium  
**AC:** Page renders captured mail; HTML preview uses `sandbox=""` iframe only.

### 4. Navbar link — `app/components/journal/JournalNavbar.vue`
Insert **Mail** link before **Submit Manuscript** when `public.enableMailViewer` is true (authenticated block only).
**Complexity:** trivial  
**AC:** Link visible only when flag on and user is signed in; appears left of Submit Manuscript.

### 5. Admin sidebar alignment — `app/layouts/admin.vue`
Replace `import.meta.dev` with `useRuntimeConfig().public.enableMailViewer`; point link to `/mail`.
**Complexity:** trivial  
**AC:** Admin sidebar shows Mail when flag on, not merely in dev build.

## Untested paths

- No automated tests for mail viewer; manual verification only.

## Regression checklist

- `server/api/dev/mail.get.ts` — list endpoint
- `server/api/dev/mail/[id].get.ts` — detail endpoint
- `app/pages/admin/dev-mail.vue` — existing admin page (still loads or redirects)
- `JournalNavbar.vue` — nav order and auth states
- `sendEmail` / local capture — unchanged

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (admin dev-mail deferred)
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified (single flag source)
- [ ] Performance delta noted as neutral in solution.md
