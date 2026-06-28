# Problem — notification stats + email preference enforcement

## Root cause
Notification preferences were stored on users but never consulted before sending transactional emails, and the notifications list page lacked the stats dashboard Laravel exposes via `getRealTimeStats`.

## Symptoms
- Disabling email prefs in `/notifications/preferences` had no effect on outbound mail.
- `/notifications` showed only the list — no total/unread/today/this-week summary cards.
- New-submission editor emails incorrectly used `sendReviewInvitationEmail`.

## Affected files
- `server/utils/email.ts` call sites (editor/author/reviewer routes, `editorNotifications.ts`, `journals/index.post.ts`)
- `app/pages/notifications/index.vue`
- Missing: `server/api/notifications/stats.get.ts`, `server/utils/notificationPreferences.ts`

## Blast radius
All preference-gated editorial emails; notifications index page for every authenticated role.

## Constraints
- Auth/account emails (activation, password reset, welcome) must remain always-on.
- In-app notifications (SSE) unchanged — prefs gate email only.

## Edge cases
- Users with null `notification_preferences` column → defaults apply (all on except weekly_summary).
- `frequency` (daily/weekly batching) deferred — not implemented in Laravel send path either.
