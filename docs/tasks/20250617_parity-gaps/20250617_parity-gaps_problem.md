# Problem — Laravel parity P1 gaps

## Root cause
JAPR parity matrix marked core systems "Done" before several Laravel user-facing capabilities were ported: file download, notification preferences/export, author interests onboarding, and a thinner author dashboard.

## Symptoms
- Approved journal detail has no download action (Laravel has authenticated download on `view-abstract`)
- `/notifications` lacks preferences page and CSV export
- Authors land on `/author` without interests gate (Laravel redirects to `/interests`)
- Author dashboard shows counts only; no recent submissions or inline collections grid
- Author submission detail has version list but no link to compare/revert UI

## Affected files
- `server/api/journals/[id]/download.get.ts` (new)
- `app/pages/journals/[slug].vue`
- `app/pages/author/index.vue`
- `app/utils/workspace.ts`, `app/pages/auth/login.vue`, `server/api/me.get.ts`
- `server/db/schema/users.ts`, migration `0002_notification_preferences.sql`
- `server/api/notifications/export.get.ts`, `server/api/users/[id]/notification-preferences.patch.ts` (new)
- `app/pages/notifications/preferences.vue` (new), `app/pages/notifications/index.vue`
- `app/pages/author/submissions/[id].vue`

## Blast radius
Authors, authenticated readers on public journal pages, all roles using notifications.

## Constraints
- `/author/*` prefix stays (intentional divergence from Laravel `/dashboard`)
- No new npm dependencies
- Download only for `approved` journals unless owner/editor/reviewer (preview path unchanged)

## Edge cases
- Missing `journalUrl` → 404 on download
- Google OAuth login must also respect interests gate
- Users with admin + author roles should not be forced to interests if not author-only
