# Problem — Dashboard Perfect Parity

## Root Cause
The Nuxt rewrite implemented functional role dashboards and queue pages, but the Laravel reference dashboards included operational analytics, embedded workflow context, audit reporting, and role-specific action panels that were either deferred, simplified, or made inconsistent after the newer desk-review workflow was added.

## Symptoms
- Admin dashboard only shows users, roles, and categories; the reference shows journal KPIs, review throughput, system health, charts, top reviewers, role distribution, test email, and audit entry points.
- Editor dashboard shows only four generic counts and shortcuts; the reference includes managing-editor ready-for-notice urgency, status reference, regional expertise prompts, greeting, and calendar.
- Reviewer dashboard shows summary cards only; the reference includes assigned-journal cards, filters, recent/urgent markers, performance metrics, quick actions, notification refresh, and calendar.
- New `desk_review` submissions are not visible in the current editor pending queue.
- `/api/stats` exists but homepage stats remain hardcoded.
- Admin audit dashboard is absent by explicit prior deferral.

## Affected Files / Functions
- `app/pages/admin/index.vue`, `app/layouts/admin.vue`
- `app/pages/editor/index.vue`, `app/layouts/editor.vue`, `app/pages/editor/submissions.vue`, `app/pages/editor/copy-desk.vue`
- `app/pages/reviewer/index.vue`, `app/layouts/reviewer.vue`, `app/components/dashboard/ReviewerQueueList.vue`
- `app/pages/author/index.vue`
- `app/pages/index.vue`
- `app/components/dashboard/JournalQueueList.vue`, `JournalStatusBadge.vue`, `NotificationDropdown.vue`
- `server/api/editor/journals/*.get.ts`, `server/api/reviewer/journals/*.get.ts`, `server/api/stats.get.ts`
- New admin metrics/audit endpoints and audit persistence modules.

## Blast Radius
All role home dashboards, workflow queue visibility, dashboard navigation, homepage stats, admin management visibility, notifications entry points, and performance of count-only dashboard loads.

## Constraints
Keep the Nuxt/Vue architecture, Drizzle/Postgres data layer, existing role names, and current manuscript state machine. Do not restore Laravel-only implementation details blindly; replace placeholder metrics with real data. No new dependencies unless justified by the chosen chart strategy.

## Edge Cases
Legacy `pending` submissions must remain actionable beside new `desk_review` rows. Multi-role users must retain current workspace priority unless explicitly changed. Copy-desk-only users must have a reachable home. Empty databases must render useful zero states, not broken charts.
