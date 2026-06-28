# Problem — Mail viewer for authenticated users

## Root cause

Local captured mail (`.data/mail/*.json`) is only exposed via an admin-only Bootstrap page (`/admin/dev-mail`) with implicit non-production access; there is no user-facing inbox, no navbar entry, and the feature flag is not exposed to the client for conditional UI.

## Symptoms

- Developers and demo users cannot browse captured emails without an admin session.
- No link appears in the main site navbar near **Submit Manuscript**.
- `NUXT_ENABLE_MAIL_VIEWER` exists in runtime config but admin sidebar uses `import.meta.dev` instead of the flag.
- User expectation: `.data/mail` stays out of git but remains readable at runtime when explicitly enabled.

## Affected files / functions

- `server/utils/devMail.ts` — `assertMailViewerAccess` (admin + implicit localDev bypass)
- `server/api/dev/mail.get.ts`, `server/api/dev/mail/[id].get.ts`
- `app/pages/admin/dev-mail.vue` — admin-only viewer
- `app/components/journal/JournalNavbar.vue` — Submit Manuscript button (~L186)
- `nuxt.config.ts` — `enableMailViewer` (private only)
- `.gitignore` — `.data/mail/` (already ignored)

## Blast radius

- All authenticated users when flag is on (activation codes, reset links, temp passwords visible).
- Navbar on every public-layout page.
- Existing admin dev-mail page and API consumers.

## Constraints

- `.data/mail/` must remain gitignored; never commit captured mail.
- Feature must be **off by default** and only active when env flag is `true` (no implicit local bypass).
- Render captured HTML only in a sandboxed iframe, never `v-html`.
- Reuse existing `listLocalEmails` / `getLocalEmail` — do not duplicate the reader.

## Edge cases

- Flag off → API returns 404, nav link hidden, direct `/mail` route shows disabled state.
- Empty mail dir → friendly empty state.
- Unauthenticated access → 401 from API, page redirects via auth middleware.
