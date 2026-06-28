# Plan — Dashboard Perfect Parity

## Goal
Bring Japr dashboards to practical parity with the Laravel reference while preserving the Nuxt/Vue architecture, the current manuscript state machine, and newer Japr improvements such as review-policy acceptance and desk publication.

## Implementation Steps

1. [x] **Add dashboard summary types** — Create `shared/types/dashboard.ts` for admin/editor/reviewer/author/public summary response shapes used by endpoints and pages.
   - Complexity: low
   - AC: TypeScript pages and endpoints import shared dashboard summary types instead of duplicating response shapes.

2. [x] **Add shared dashboard stat card** — Create `app/components/dashboard/DashboardStatCard.vue` with props for `label`, `value`, `icon`, `iconClass`, optional `meta`, and optional loading state.
   - Complexity: low
   - AC: Admin, editor, and reviewer stat cards can render the Laravel card anatomy from one component.

3. [x] **Add shared dashboard error callout** — Create `app/components/dashboard/DashboardSummaryError.vue` for failed summary loads with message and retry button.
   - Complexity: low
   - AC: Dashboard indexes no longer silently display zeros when summary APIs fail.

4. [x] **Add optional calendar/date panel** — Create `app/components/dashboard/DashboardCalendarPanel.vue` as a lightweight replacement for the Laravel right-column calendar.
   - Complexity: low
   - AC: Admin/editor/reviewer landing pages can show today, month, and week context without adding a calendar dependency.

5. [x] **Create editor summary endpoint** — Add `server/api/editor/dashboard/summary.get.ts` using `requireEditorOrCopyDesk` where appropriate and Drizzle aggregate queries for `desk_review`, legacy `pending`, `in-progress`, `under_peer_review`, `reviewed`, `ready_for_managing_editor_notice`, `approved`, `approved_with_comment`, `published`, `changes_requested`, and `declined`.
   - Complexity: medium
   - AC: One endpoint returns all editor dashboard counts and includes both `desk_review` and `pending` visibility.

6. [x] **Fix editor desk-review queue visibility** — Modify `server/api/editor/journals/pending.get.ts` or add `server/api/editor/journals/desk-review.get.ts`; update `app/pages/editor/submissions.vue` or add `app/pages/editor/desk-review.vue` so new submissions are visible.
   - Complexity: medium
   - AC: A manuscript created with `approvalStatus = desk_review` appears in an editor-accessible dashboard queue.

7. [ ] **Align editor copy-desk access** — Update `app/pages/editor/copy-desk.vue`, `app/layouts/editor.vue`, and relevant server guards so visible Copy Desk links match allowed roles.
   - Complexity: low
   - AC: Any role that sees the Copy Desk link can open the page, and copy-desk-only users still land on a useful route.

8. [x] **Update editor landing page** — Modify `app/pages/editor/index.vue` to use the summary endpoint, shared stat cards, ready-for-notice emphasis, status reference card, regional expertise prompt, greeting panel, calendar/date panel, and full workflow count set.
   - Complexity: medium
   - AC: Editor dashboard exposes all original workflow cues plus Japr desk/copy-desk states without full-list count fetches.

9. [x] **Add editor status reference component** — Create `app/components/dashboard/EditorStatusReference.vue` using `MANUSCRIPT_STATUS_LABELS` and `MANUSCRIPT_STATUS_COLORS`.
   - Complexity: low
   - AC: Status names and colors on the editor reference panel stay consistent with `shared/constants/manuscriptStatus.ts`.

10. [x] **Add editor sidebar count badges** — Modify `app/layouts/editor.vue` to read the editor summary and show count badges for workflow submenu entries.
    - Complexity: medium
    - AC: Sidebar queue counts match the editor dashboard counts after page refresh.

11. [x] **Create reviewer summary endpoint** — Add `server/api/reviewer/dashboard/summary.get.ts` with assigned counts, recent assignments, pending invitations, reviewer-declined invitations, journal-declined manuscripts, overdue/urgent data, and real performance metrics.
    - Complexity: medium
    - AC: One endpoint provides reviewer landing cards, assignment list, and performance data without five full-list requests.

12. [ ] **Clarify reviewer declined semantics** — Modify `server/api/reviewer/journals/rejected.get.ts` or add a separate declined-invitations endpoint so “Declined” is not confused with journal-level rejection.
    - Complexity: medium
    - AC: Reviewer UI labels distinguish “Declined Invitations” from “Declined Manuscripts” or intentionally relabel the existing queue.

13. [x] **Add reviewer assignment cards** — Create `app/components/dashboard/ReviewerAssignmentCards.vue` with filter pills for all/pending/reviewed/in-progress, recent badge, urgent badge, status badge, and review CTA.
    - Complexity: medium
    - AC: Reviewer landing page includes an embedded assigned-journal section matching original behavior.

14. [x] **Update reviewer landing page** — Modify `app/pages/reviewer/index.vue` to use the summary endpoint, shared stat cards, assignment cards, performance panel, quick actions, greeting panel, and calendar/date panel.
    - Complexity: medium
    - AC: Reviewer dashboard shows the original five cards, assigned-list workflow, performance metrics, notifications/settings quick actions, and no silent zero fallback.

15. [x] **Add reviewer sidebar count badges** — Modify `app/layouts/reviewer.vue` to use reviewer summary counts for queue submenu badges.
    - Complexity: low
    - AC: Reviewer sidebar queue counts match visible landing and queue page categories.

16. [x] **Create admin dashboard summary endpoint** — Add `server/api/admin/dashboard/summary.get.ts` using `requireAdmin` and aggregate queries for journals, users, roles, review performance, overdue reviews, system health, status distribution, monthly submissions, top reviewers, and role distribution.
    - Complexity: high
    - AC: Admin dashboard data is served by one endpoint and covers every original admin metric except audit, which has its own endpoints.

17. [x] **Add admin health and distribution panels** — Create `app/components/dashboard/AdminHealthCard.vue`, `AdminReviewPerformanceCard.vue`, `AdminDistributionPanel.vue`, and `AdminTopReviewersTable.vue`.
    - Complexity: medium
    - AC: Admin dashboard can render system health, review performance, role distribution, journal status distribution, and top reviewers from typed props.

18. [x] **Add dependency-free chart panel** — Create `app/components/dashboard/SimpleTrendChart.vue` for submission trends and audit activity using accessible HTML/CSS bars or SVG.
    - Complexity: medium
    - AC: Trends render without a new package and show labels for each period.

19. [x] **Update admin landing page** — Modify `app/pages/admin/index.vue` to use the admin summary endpoint, add greeting, full KPI set, system health, review performance, quick actions, trend chart, status distribution, top reviewers, role distribution, and calendar/date panel.
    - Complexity: high
    - AC: Admin dashboard matches the original operational surface and retains existing Users/Roles/Categories navigation.

20. **Add admin test email action** — Add `server/api/admin/dashboard/test-email.post.ts` and UI action in `app/pages/admin/index.vue` or preserve an equivalent dev-mail workflow if production email testing is intentionally unavailable.
    - Complexity: medium
    - AC: Admin can trigger a visible success/error result for email-system verification.

21. **Add audit schema and migration** — Add an `admin_audit_logs` table in `server/db/schema` and a Drizzle migration for user, action, resource type/id, description, IP, user agent, changes JSON, created time, and risk metadata.
    - Complexity: high
    - AC: Migration creates audit storage without affecting existing auth/workflow tables.

22. **Add audit logging utility** — Create `server/utils/adminAudit.ts` with `logAdminAction`, `getAuditRiskLevel`, and helpers for common role/user/category/journal/admin actions.
    - Complexity: medium
    - AC: High-risk actions can be logged consistently with risk level and description.

23. **Wire audit logging into admin mutations** — Modify admin-facing mutation endpoints under `server/api/users`, `server/api/roles`, `server/api/categories`, and selected editor/admin journal actions to call `logAdminAction`.
    - Complexity: high
    - AC: Creating/updating/deleting users, roles, permissions, categories, and key journal decisions creates audit rows.

24. **Add audit list endpoints** — Add `server/api/admin/audit/index.get.ts`, `[id].get.ts`, `stats.get.ts`, `export.get.ts`, and `cleanup.post.ts` with admin-only guards.
    - Complexity: high
    - AC: Audit logs can be filtered by user/action/resource/date/risk, viewed in detail, exported as CSV, summarized, and cleaned with bounds.

25. **Add audit dashboard UI** — Create `app/pages/admin/audit/index.vue`, `app/pages/admin/audit/[id].vue`, and `app/pages/admin/audit/dashboard.vue`; add navigation links in `app/layouts/admin.vue`.
    - Complexity: high
    - AC: Admin can access audit stats, filterable log table, detail page, export, and cleanup actions.

26. [x] **Wire public homepage stats** — Modify `app/pages/index.vue` to use `/api/stats` with loading, error, and zero states instead of hardcoded values.
    - Complexity: low
    - AC: Homepage stat values come from `server/api/stats.get.ts`.

27. **Enhance author dashboard metadata** — Modify `server/api/author/submissions.get.ts` and `app/pages/author/index.vue` to include safe category labels, reviewer count, relative update time, and a richer empty state.
    - Complexity: medium
    - AC: Author recent submissions regain original metadata without exposing confidential reviewer identity.

28. **Improve notification dropdown errors** — Modify `app/components/dashboard/NotificationDropdown.vue` so fetch failures show a compact retry/error state instead of silently rendering no notifications.
    - Complexity: low
    - AC: Simulated dropdown fetch failure is visibly distinguishable from “No notifications.”

29. **Add role quick action consistency** — Update `app/pages/editor/index.vue`, `app/pages/reviewer/index.vue`, and `app/pages/admin/index.vue` so notification/settings/audit/workflow quick actions match the original role dashboards.
    - Complexity: low
    - AC: Every original quick action has an equivalent visible action or documented intentional replacement.

30. **Improve unauthorized dashboard feedback** — Modify `app/middleware/role.ts` or shared auth feedback handling so dashboard access denial creates a visible message instead of a silent home redirect.
    - Complexity: medium
    - AC: Attempting to access a forbidden dashboard route shows clear feedback.

31. **Add summary endpoint tests** — Create tests under `tests/dashboard-summary.test.ts` or split per role to validate admin/editor/reviewer/public summary outputs with seeded records.
    - Complexity: high
    - AC: Tests cover `desk_review` visibility, legacy `pending`, dashboard counts, reviewer metrics, and homepage stats.

32. **Add audit tests** — Create `tests/admin-audit.test.ts` for audit risk classification, log creation, filtering, export authorization, and cleanup bounds.
    - Complexity: high
    - AC: Audit behavior is covered before wiring it broadly into mutations.

33. **Add component and route verification pass** — Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; then run `ReadLints` on edited files.
    - Complexity: medium
    - AC: All automated checks complete without new errors.

34. **Manual role matrix verification** — Verify dashboards manually for `admin`, `editor_in_chief`, `managing_editor`, `copy_desk_editor`, `associate_editor`, `external_reviewer`, `desk_editor`, and `author`.
    - Complexity: high
    - AC: Each role can reach its intended dashboard, see correct counts, use quick actions, and avoid forbidden routes.

35. **Dead code and consistency cleanup** — Remove or update unused hardcoded stat constants, duplicate index fetches, superseded redirect stubs, and any stale dashboard docs.
    - Complexity: medium
    - AC: No unused dashboard code remains from the pre-parity implementation.

36. **Write changelog and update task index** — Write `docs/tasks/20260627_dashboard-perfect-parity/20260627_dashboard-perfect-parity_changelog.md` after implementation and update `docs/tasks/README.md` to `done` only after all Definition of Done checks are met.
    - Complexity: trivial
    - AC: Changelog maps every plan step to the final files touched.

## Untested Path Disclosure
- There is no automated browser/visual regression suite in the repo today.
- Audit logging will need seedable test fixtures because the runtime database may not have existing audit rows.
- System health log inspection may be environment-dependent; if reliable log metrics are not available, the implementation must expose “not measurable” instead of inventing a score.
- Reviewer quality score has no confirmed data source in Japr; the plan replaces the original random value with real measurable metrics and omits quality score unless a source is added.

## Regression Checklist
- `app/pages/editor/index.vue`: copy-desk-only redirect, editor summary cards, role-gated ready-for-notice panel.
- `app/layouts/editor.vue`: sidebar workflow links and count badges.
- `app/pages/editor/submissions.vue`: legacy pending and new desk-review visibility.
- `app/pages/editor/copy-desk.vue`: role access and publish action.
- `app/pages/reviewer/index.vue`: count cards, assignment list, quick actions.
- `app/layouts/reviewer.vue`: queue links and badges.
- `app/pages/admin/index.vue`: admin analytics, quick actions, management links.
- `app/layouts/admin.vue`: audit navigation and existing admin links.
- `app/pages/author/index.vue`: author metadata and confidentiality constraints.
- `app/pages/index.vue`: public stats.
- `app/components/dashboard/NotificationDropdown.vue`: dropdown success/empty/error states.
- `server/api/editor/journals/*`: queue membership and permission guards.
- `server/api/reviewer/journals/*`: reviewer assignment semantics.
- `server/api/users/*`, `roles/*`, `categories/*`: audit logging does not alter mutation behavior.
- `server/utils/journalWorkflow.ts`: status transitions unchanged.
- `shared/constants/manuscriptStatus.ts`: labels/colors remain the status source of truth.

## Definition of Done
- [ ] App runs without new warnings or errors.
- [ ] Every acceptance criterion in this plan is verified.
- [ ] Regression checklist cleared for all listed callers/routes.
- [ ] Dead code audit complete; orphaned code removed or documented.
- [ ] No new `any` types or unsafe assertions without inline justification.
- [ ] No new dependencies without justification in `solution.md`.
- [ ] Cross-file consistency verified for statuses, role names, dashboard labels, and count semantics.
- [ ] Performance baseline recorded before and after for dashboard summary loads.
- [ ] Admin audit logging is either fully implemented or explicitly excluded by user sign-off.
- [ ] `20260627_dashboard-perfect-parity_changelog.md` is written before marking the task `done`.
