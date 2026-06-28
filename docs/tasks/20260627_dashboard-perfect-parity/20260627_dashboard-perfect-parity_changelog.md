# Changelog — Dashboard Perfect Parity

## Layer 1 — High-Level

This implementation moves Japr dashboards substantially closer to the Laravel reference across all role workspaces. Admin now has an end-to-end audit subsystem, test-email action, permissions overview, audit navigation, and honest health measurements. Editor workflows expose published queues, desk-review actions, publication handoff, extension approval, richer manuscript metadata, reviewer timeline data, and version links. Reviewer workflows now separate declined invitations from declined manuscripts, show richer queue metadata, include pagination, expose required review text, support decline comments and extension requests, and notify editors. Author routes now use the public shell with author tabs, show enriched dashboard metadata and empty states, include manuscript preview/version detail pages, and support collection removal. Notifications now have role-prefixed routes, richer dashboard rows, pagination, dropdown retry/error state, new-submission producer payloads, and runtime sound/desktop preference behavior.

Automated verification passes for tests, lint, typecheck, and build. Browser/manual role-matrix verification was not run in this environment; the task index remains `in_progress` until that manual verification is performed.

## Layer 2 — Low-Level

### Navigation, Layouts, And Access Feedback
- `app/composables/useDashboardNavigation.ts`: added shared exact/prefix active-route helpers for dashboard shells.
- `app/layouts/admin.vue`: added explicit active classes, audit nav, permissions nav, and role-prefixed notification links.
- `app/layouts/editor.vue`: added explicit active classes, published queue link/count, and role-prefixed notification links.
- `app/layouts/reviewer.vue`: added explicit active classes, split declined manuscript/invitation links, and role-prefixed notification links.
- `app/pages/author.vue`: switched author route tree back to the public shell for Laravel-style author tabs.
- `app/layouts/public.vue`: existing author-tab hook now drives author pages.
- `app/components/journal/JournalUserNavbar.vue`: fixed tab targets, added Dashboard tab, made Interests always reachable, and corrected collection/browse action behavior.
- `app/utils/workspace.ts` and `app/composables/useRoleLayout.ts`: author shared pages now resolve through the public layout.
- `app/middleware/role.ts` and `app/pages/index.vue`: forbidden dashboard access now redirects with visible denial feedback.
- `app/pages/editor/copy-desk.vue`: allowed roles now match visible copy-desk navigation.

### Admin Audit And Admin Completion
- `server/db/schema/adminAudit.ts`, `server/db/schema/index.ts`, `server/db/migrations/0008_admin_audit_logs.sql`: added audit log storage with actor, action, resource, risk, request metadata, value snapshots, and indexes.
- `server/utils/adminAuditCore.ts`, `server/utils/adminAudit.ts`: added risk classification, sensitive-field redaction, request context extraction, and `logAdminAction`.
- `tests/adminAudit.test.ts`: added risk/redaction coverage.
- `server/api/users/*`, `server/api/roles/*`, `server/api/categories/*`, `server/api/subcategories/*`, `server/api/sub-subcategories/*`: added audit rows after successful user, role, permission, and category hierarchy mutations.
- `server/api/admin/audit/index.get.ts`, `[id].get.ts`, `stats.get.ts`, `export.get.ts`, `cleanup.post.ts`: added filtered list, detail, 30-day stats, CSV export, and bounded cleanup.
- `app/pages/admin/audit/index.vue`, `[id].vue`, `dashboard.vue`: added audit log table, detail view, stats dashboard, export, filtering, pagination, and cleanup UI.
- `server/api/admin/dashboard/test-email.post.ts`: added audited admin test-email action.
- `app/pages/admin/index.vue`: added Test Email, Audit Logs, Permissions quick actions and visible test-email feedback.
- `app/pages/admin/permissions.vue`: added permission overview with role-assignment handoff.
- `server/api/admin/dashboard/summary.get.ts`, `shared/types/dashboard.ts`, `app/components/dashboard/AdminHealthCard.vue`, `server/utils/dashboardSummary.ts`: replaced fake health values with measured/unmeasured flags.

### Editor Dashboard And Workflow
- `server/api/editor/journals/published.get.ts`, `app/pages/editor/published.vue`: added published queue.
- `app/pages/editor/journals/[uuid].vue`: added metadata panel, desk-review send/reject actions, approve-for-publication action, extension approval UI, reviewer deadline/history fields, and version action links.
- `server/utils/submissions.ts`: enriched journal details with category/subcategory/sub-subcategory labels.

### Reviewer Dashboard And Workbench
- `app/components/dashboard/ReviewerQueueList.vue`: added submitted/assigned/deadline/reviewed dates, recent/urgent badges, Review CTA, empty states, and client-side pagination.
- `server/api/reviewer/journals/pending.get.ts`, `in-progress.get.ts`, `reviewed.get.ts`, `approved.get.ts`, `rejected.get.ts`: added queue metadata, recent/urgent flags, and review submitted dates.
- `server/api/reviewer/journals/declined-invitations.get.ts`, `app/pages/reviewer/declined-invitations.vue`: split declined invitations from declined manuscripts.
- `app/pages/reviewer/journals/[uuid]/review.vue`: added required full review field, decline-with-comment form, extension request UI, peer review context display, and extension status.
- `server/api/reviewer/journals/[uuid]/request-extension.post.ts`, `server/utils/editorNotifications.ts`: reviewer extension requests now notify editors in-app and by email preference.

### Author Dashboard, Submissions, Versions, Collections
- `server/api/author/submissions.get.ts`: enriched author submissions with safe category label and reviewer count.
- `app/pages/author/index.vue`: added reviewer/category metadata, relative update time, action-required badge, policy callout, quick actions, and new-user empty state.
- `app/pages/author/submissions/[id].vue`: added protected manuscript preview and version detail links.
- `app/pages/journals/[slug]/versions/[versionId].vue`: added version detail page backed by the existing version detail API.
- `app/pages/journals/[slug]/versions/index.vue`: added View Details links and removed unused inline compare state.
- `app/pages/author/collections.vue`: added richer journal cards and remove-from-collection action.

### Notifications And Settings
- `app/components/dashboard/NotificationDropdown.vue`: added error/retry state and improved notification item layout.
- `app/pages/notifications/index.vue`: added high-priority stat, richer icon/color/action rows, filter-aware export, pagination, and action links.
- `app/pages/admin|editor|reviewer|author/notifications/*`: added role-prefixed notification and preference route wrappers.
- `app/composables/useNotifications.ts`: wired sound and desktop notification preferences to SSE events with guarded parsing.
- `server/api/journals/index.post.ts`: new manuscript submissions now create actionable in-app notifications for editors.
- `shared/validation/notifications.ts`: weekly/frequency controls remain intentionally excluded because no digest scheduler exists.
- `app/pages/notifications/preferences.vue`: fixed import order while preserving existing preference behavior.

### Verification And Hygiene
- `server/api/auth/sign-up.post.ts`, `server/api/users/index.post.ts`, `server/db/seeds/system.ts`, `server/db/seeds/associateEditors.ts`, `server/db/seeds/reviewers.ts`: added account IDs required by the current Drizzle auth schema, clearing typecheck blockers.
- `app/components/Breadcrumbs.vue`, `app/components/SettingsForm.vue`, `app/components/dashboard/DashboardProfileDropdown.vue`, `app/components/dashboard/JournalQueueList.vue`, `app/composables/useCurrentUser.ts`, `app/pages/auth/reset-password.vue`, `server/api/author/collections.get.ts`, `server/api/journals/[id]/*`, `server/api/journals/[id]/versions/*`, `server/services/versions.ts`: cleaned lint/typecheck blockers discovered during verification.

## Verification Results

- `pnpm test`: passed, 26 tests.
- `pnpm lint`: passed with 6 warnings in pre-existing/touched UI areas (`JournalFiltersPanel.vue`, `JournalNavbar.vue`, version compare `v-html`).
- `pnpm typecheck`: passed.
- `pnpm build`: passed; build emitted Nuxt/Tailwind sourcemap warnings from Vite plugins.
- Manual browser role matrix: not run here. Required before changing `docs/tasks/README.md` status to `done`.

## Skipped Or Deferred

- Full browser verification for admin, editor-in-chief, managing editor, copy desk editor, associate editor, external reviewer, desk editor, and author remains pending.
- No new digest scheduler was added for weekly/frequency notification preferences; those controls remain excluded rather than displayed as inert UI.
- No new charting dependency was added; existing dependency-free chart panels remain the implementation path.
