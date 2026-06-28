# Solution — User-facing mail inbox (flag-gated)

## Proposed approach

1. Expose `enableMailViewer` on `runtimeConfig.public` (env: `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`) so the navbar can conditionally show a **Mail** link immediately before **Submit Manuscript**.
2. Tighten `assertMailViewerAccess`: require `public.enableMailViewer === true` only (remove implicit `EMAIL_TRANSPORT=local` non-prod bypass and admin check). **No login required** so registrants can read activation mail before activating.
3. Add `app/pages/mail/index.vue` using the `public` layout — Tailwind inbox UI (list + detail split, refresh, sandboxed iframe preview) matching the main site aesthetic.
4. Wire page meta: `middleware: ['auth']` so only signed-in users reach it when the flag is on.
5. Update admin sidebar `showDevMail` to use the same public flag; optionally keep `/admin/dev-mail` as a thin redirect to `/mail` or remove duplicate UI later.
6. Confirm `.gitignore` keeps `.data/mail/` out of the repo (path is `.data/mail`, not `.data/mails` — document in UI copy).

## Alternatives rejected

- **Keep admin-only access** — rejected because the user asked for general users to see emails in dev/demo.
- **New API / duplicate mail reader** — rejected; existing `listLocalEmails` already works.
- **v-html preview** — rejected; XSS risk from captured HTML.

## Performance impact

Neutral. One directory read on page load/refresh; same as current admin viewer.

## Performance delta

Not measurable — identical file I/O to existing dev mail endpoint. No DB or socket changes.

## Trade-offs

- Any authenticated user can read sensitive dev mail (activation codes, reset links) when the flag is on. Acceptable for local/demo; must stay off in production unless explicitly enabled.
- Single public env var advertises that the feature exists when enabled (nav link visible). API still returns 404 when disabled.

## Dead code audit

- `app/pages/admin/dev-mail.vue` becomes redundant after `/mail` ships; defer removal — redirect or keep for admin layout users until a follow-up cleanup.
