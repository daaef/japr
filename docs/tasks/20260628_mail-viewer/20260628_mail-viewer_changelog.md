# Changelog — Mail viewer for all users

## Layer 1

When `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`, anyone (including guests who just registered) can open `/mail` from the navbar, activation flow, or password-reset flow and browse captured local mail. Activation codes are surfaced prominently with a one-click path back to `/auth/activate`. The feature stays off by default; `.data/mail/` remains gitignored.

## Layer 2

| File | Change |
|------|--------|
| `nuxt.config.ts` | Added `runtimeConfig.public.enableMailViewer` (env: `NUXT_PUBLIC_ENABLE_MAIL_VIEWER`). |
| `server/utils/devMail.ts` | Flag-only gate; removed admin auth and implicit localDev bypass. |
| `server/api/dev/mail.get.ts`, `[id].get.ts` | Use sync guard call; still return captured JSON mail. |
| `app/pages/mail/index.vue` | New public inbox UI: filter by recipient, list/detail, activation code highlight, sandboxed iframe. |
| `app/components/journal/JournalNavbar.vue` | **Mail** link before **Submit Manuscript** (desktop + mobile) when flag on. |
| `app/pages/auth/activate.vue` | Link to mail inbox; accepts `code` query prefill from mail page. |
| `app/pages/auth/success-activation.vue` | **View captured mail** button after registration. |
| `app/pages/auth/success-reset-request.vue` | **View captured mail** button after reset request. |
| `app/layouts/admin.vue` | Sidebar links to `/mail` when flag on (not `import.meta.dev`). |
| `app/pages/admin/dev-mail.vue` | Redirects to `/mail`. |
