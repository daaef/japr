# Layer 1

JAPR now closes five functional parity gaps with the Laravel journal app: authenticated download of approved manuscripts, a richer author dashboard (four stat cards, recent submissions, inline collection cards), author interests onboarding after login, notification preferences and CSV export, and version compare/revert links from the author submission detail page.

# Layer 2

| File | Change |
|------|--------|
| `server/api/journals/[id]/download.get.ts` | New endpoint: attachment download for approved journals (or owner/editor/assigned reviewer). |
| `app/pages/journals/[slug].vue` | Download button in approved-journal actions sidebar. |
| `app/pages/author/index.vue` | Four stat cards, recent submissions list, collections grid, quick actions — matches Laravel dashboard content. |
| `app/utils/workspace.ts` | `resolveWorkspacePath` accepts `hasInterests`; authors without interests go to `/author/interests`. |
| `server/api/me.get.ts` | Returns `hasInterests` and `notificationPreferences`. |
| `app/composables/useCurrentUser.ts` | Types updated for new `/api/me` fields. |
| `app/pages/auth/login.vue`, `app/middleware/guest.ts` | Pass `hasInterests` into workspace redirect. |
| `app/middleware/author-onboarding.ts` | Redirects author-only users without interests away from `/author/*` (except interests page). |
| `app/pages/author.vue` | Applies `author-onboarding` middleware to all author routes. |
| `app/pages/author/interests.vue` | Refreshes session and navigates to `/author` after first interests save. |
| `server/db/schema/users.ts` | Added `notificationPreferences` jsonb column. |
| `server/db/migrations/0002_notification_preferences.sql` | Migration for preferences column with defaults. |
| `shared/validation/notifications.ts` | Zod schema and defaults for notification preferences. |
| `server/api/users/[id]/notification-preferences.patch.ts` | Save user notification preferences. |
| `server/api/notifications/export.get.ts` | CSV export of notifications. |
| `app/pages/notifications/preferences.vue` | Preferences UI (email, in-app, frequency). |
| `app/pages/notifications/index.vue` | Preferences link and Export CSV button. |
| `app/pages/author/submissions/[id].vue` | Link to `/journals/[slug]/versions` for compare/revert. |
| `docs/parity-matrix.md` | Updated author workspace and notifications notes. |
