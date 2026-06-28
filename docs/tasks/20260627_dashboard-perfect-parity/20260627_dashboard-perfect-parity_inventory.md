# Dashboard Perfect Parity Inventory

This inventory records every confirmed missing or divergent dashboard feature found by comparing `C:\Users\reala\Projects\japr` with `C:\Users\reala\Creations\journal`.

## Global / Cross-Role

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Count-only dashboard APIs | Laravel controllers compute counts server-side. | Editor/reviewer fetch full lists and count arrays. | Add summary endpoints per role and switch landing pages to them. |
| Dashboard loading states | Laravel full-page render has preloader in dashboard layouts. | Index stat cards have no explicit loading state. | Add skeleton/spinner or disabled zero state for summary loads. |
| Dashboard error states | Laravel redirects/Toastr on action failures; admin metrics have safe defaults. | Many `useFetch` defaults silently convert failures to zero. | Show non-blocking error callouts and retry actions. |
| Greeting banner | Admin/editor original dashboards greet the current user. | Removed from admin/editor/reviewer role indexes. | Restore role-appropriate greeting panels using current user data. |
| Calendar column | Admin/editor/reviewer layouts include calendar widget area. | Not present in Nuxt role landing pages. | Add lightweight date/calendar panel or explicitly scoped replacement. |
| Notification dashboard link parity | Original role layouts link to notification dashboard. | Present, but dashboard landing quick actions do not always expose it. | Add role landing quick actions where original had them. |
| Public homepage stats | Original public stats were dynamic through backend data patterns. | `server/api/stats.get.ts` exists but `app/pages/index.vue` hardcodes values. | Wire homepage stat cards to `/api/stats` with loading/error states. |

## Admin Dashboard

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Total journals KPI | Shows total journals. | Missing from `app/pages/admin/index.vue`. | Add admin summary endpoint and card. |
| Approved journals KPI | Shows approved journals. | Missing. | Add count for `approved` and `approved_with_comment`. |
| Pending manuscripts KPI | Shows pending manuscripts with overdue signal. | Missing. | Add count for `desk_review` + legacy `pending`, plus overdue review signal. |
| Rejected/declined count | Controller computes declined count. | Missing. | Include in status distribution and optional KPI. |
| Recent submissions count | Shows `+N this month`. | Missing. | Add current-month journal count. |
| Average processing time | Shows average days to completion. | Missing. | Compute from created/updated or status timestamp fields available today. |
| Total users KPI enhancement | Shows total users and new users this month. | Only total users. | Add new-users-this-month metadata. |
| Active reviewers count | Shows active associate editors/reviewers. | Missing. | Count users with reviewer/editor roles and availability flag where available. |
| Average review time | Shows average review completion time. | Missing. | Compute from reviewer assignment timestamps. |
| Reviews completed this month | Shows current-month completed reviews. | Missing. | Add aggregate. |
| Overdue reviews | Shows overdue count and status. | Missing from dashboard. | Use reviewer deadline fields from reviewer-deadlines task. |
| System health card | Shows email/storage/log-health checks and score. | Missing. | Add server endpoint returning email config present, storage check, recent app errors if measurable. |
| Quick action: test email | Admin can send test notification email. | Missing. | Add admin-only dev/test email action or preserve existing dev-mail viewer if preferred. |
| Quick action: audit dashboard | Links to audit dashboard. | Audit dashboard absent. | Add audit dashboard and nav link. |
| Submission trends chart | Chart.js line chart for last six months. | Missing. | Add simple built-in/CSS chart or justified chart dependency. |
| Journal status distribution | Lists counts by status. | Missing. | Add status distribution panel using shared labels/colors. |
| Top performing reviewers | Table of top reviewers in last 90 days. | Missing. | Add aggregate table with real completed-review counts. |
| User role distribution | Shows user counts and percentages by role. | Missing. | Add aggregate table/panel. |
| Admin audit stats dashboard | Dedicated stats, charts, top users, high-risk actions. | Explicitly deferred in `docs/tasks/README.md`. | Implement audit model/table/endpoints/pages if approved. |
| Audit log filtering | Filter by user/action/resource/date/risk. | Missing. | Add `admin/audit` table page and filters. |
| Audit export | CSV export. | Missing. | Add admin-only CSV endpoint. |
| Audit cleanup | Cleanup old audit logs. | Missing. | Add guarded cleanup action with audit entry. |

## Editor Dashboard

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Ready-for-notice KPI on landing | Managing Editor sees ready-for-notice count in main card row. | `editor/index.vue` only fetches pending/in-progress/reviewed/approved. | Add role-aware ready-for-notice summary card. |
| Managing Editor actions-required card | Shows action panel when ready-for-notice > 0. | Missing. | Add conditional card linking to `/editor/ready-for-notice`. |
| Status reference card | Explains Pending/In Review/Ready/Approved/Revision/Declined. | Missing. | Add role-gated reference panel using shared status labels. |
| Regional expertise tools card | Prompts smart reviewer matching with links. | Missing from landing page. | Add panel linking to pending and under-peer-review; keep actual matching on detail pages. |
| Greeting hero | Original editor dashboard greets user. | Missing. | Add greeting section. |
| Calendar column | Original has calendar in right column. | Missing. | Add compact calendar/date panel. |
| Sidebar live badge counts | Original editor sidebar contains inline count badges. | Nuxt sidebar has labels only. | Add count badges from editor summary endpoint. |
| Under Review label mismatch | Original differentiates in-progress/under peer review. | Landing “Under Review” uses `/in-progress`. | Align labels and counts with status model. |
| Under-peer-review count | Original has route and sidebar context. | Queue exists but landing count omitted. | Add summary count. |
| In-progress count clarity | Original has in-progress workflows. | Landing uses it as “Under Review.” | Rename or add separate card. |
| Revision-requested count | Original has list page. | Queue exists but landing count omitted. | Add summary count or secondary summary row. |
| Declined count | Original controller computes declined. | Queue exists but landing count omitted. | Add summary count. |
| Desk-review queue visibility | Current workflow creates `desk_review`. | `/editor/submissions` filters `pending` only. | Add `desk-review` API/page or include `desk_review` in pending/desk queue with clear label. |
| Copy desk role consistency | Original has no copy desk home; Japr has copy-desk page. | Sidebar shows Copy Desk broadly; page meta excludes `managing_editor`. | Align page meta, API guard, and sidebar visibility intentionally. |
| Copy-desk-only home | Original copy desk not wired; Japr redirects copy-desk-only users. | `/editor` redirects to `/editor/copy-desk`. | Keep reachable, add summary/landing affordance if needed. |

## Reviewer / Desk Editor Dashboard

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Assigned journals list on home | Original embeds assigned manuscript cards. | Landing only shows counts + CTA. | Add embedded assignment section or make `/reviewer/reviews` real. |
| Client-side status filters | Original filters All/Pending/Reviewed/In Progress. | Queue pages are separate; no home filters. | Add filter pills on embedded assignment section. |
| Recent marker | Original marks updated <= 7 days. | Missing. | Add computed recent badge. |
| Urgent marker | Original marks old pending assignments. | Missing. | Add deadline/age-based urgent badge using reviewer deadlines. |
| Review CTA on each card | Original has per-journal Review button. | Queue rows have Open, landing lacks list. | Add CTA in embedded list. |
| Pagination on assigned list | Original paginates all assigned journals. | Queue components do not expose pagination. | Add paginated/recent assignment API or limit + link. |
| Performance metrics panel | Original shows avg review time, completion rate, this month, quality score. | Missing. | Add real metrics; do not use random placeholders. |
| Reviewer quick actions | Original links to pending reviews, notifications, settings. | Landing only has View assignments. | Add quick actions row. |
| Reviewer notification polling | Original polls unread count every 30s. | Shared dropdown loads on open and composable tracks unread. | Decide whether SSE/composable already supersedes polling; document and add refresh if needed. |
| Calendar column | Original has calendar. | Missing. | Add compact calendar/date panel. |
| Declined semantic mismatch | Original declined card means reviewer-scoped declined journals/invitations. | `rejected.get.ts` filters journal declined, not reviewer declined invitations. | Split reviewer-declined invitations from journal-declined manuscripts or relabel. |
| Desk Editor home | Original Desk Editor shares reviewer dashboard. | Japr `desk_editor` also shares reviewer dashboard. | Keep shared behavior unless desk-specific requirements are approved. |

## Author Dashboard

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Reviewer count on recent submissions | Original shows reviewer count per submission. | Recent list only shows status/action required/date. | Include reviewer count if API exposes it safely. |
| Category label on recent submissions | Original shows category name. | API type includes `categoryId`, not category display. | Include category label if author submissions API joins category. |
| Relative updated time | Original uses `diffForHumans()`. | Japr uses locale date. | Decide parity target; likely show relative time plus exact title. |
| Empty state icon/action parity | Original has richer welcome CTA. | Japr has quick actions but no final empty-state block after recent/collections. | Add empty-state section when no submissions/collections. |
| My Collections rendering parity | Original uses journal component grid. | Japr renders `JournalCard` list. | Verify visual parity and adjust spacing/card style if needed. |
| Review policy gate | Original did not have this feature. | Japr adds gate. | Keep as Japr improvement; do not remove. |

## Notifications Dashboard

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Role-aware shell | Original wraps content in role-specific dashboard layout. | `useRoleLayout()` does this. | Keep; verify all role layouts render correctly. |
| Notification dashboard stats | Original has total/unread/today/week. | Present. | Keep. |
| Filters | Original filters type/status. | Present. | Keep. |
| Export | Original supports dashboard-adjacent notification export. | Present via CSV export. | Keep. |
| Dropdown failure visibility | Original dropdown logs/falls back. | Japr swallows dropdown errors to empty list. | Add unobtrusive error state or retry affordance. |
| Landing quick link parity | Original reviewer quick actions link notifications. | Some Japr landing pages omit this. | Add role quick action links. |

## Navigation / Access

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Login redirect parity | Original redirects by role priority: admin, editor, reviewer/desk, author. | Japr uses workspace utilities/middleware. | Verify priority and document intentional differences. |
| Unauthorized dashboard feedback | Original redirects with error toast. | Role middleware redirects to `/` with no message. | Add visible access-denied feedback if consistent with app patterns. |
| Multi-role reviewer access | Original priority may hide lower-role homes. | Japr priority admin > editor > reviewer. | Keep unless user asks otherwise; verify links allow intended role switching. |
| Admin audit nav | Original admin quick action and audit pages. | Missing. | Add sidebar/quick action once audit exists. |

## Data / Logic / Backend

| Missing or divergent item | Original behavior | Japr state | Implementation target |
|---|---|---|---|
| Admin dashboard summary endpoint | Controller returns rich metrics. | No endpoint. | Add `server/api/admin/dashboard/summary.get.ts`. |
| Editor dashboard summary endpoint | Controller returns six counts. | Four full-list fetches. | Add `server/api/editor/dashboard/summary.get.ts`. |
| Reviewer dashboard summary endpoint | Controller returns counts, assigned lists, metrics. | Five full-list fetches. | Add `server/api/reviewer/dashboard/summary.get.ts`. |
| Audit persistence | Original `AdminAuditLog` model/table. | Deferred/missing. | Add schema, migration, logging utility, admin endpoints. |
| High-risk audit classification | Original classifies delete/role/permission/system actions. | Missing. | Add shared audit risk classifier. |
| Audit export | Original streams CSV. | Missing. | Add `server/api/admin/audit/export.get.ts`. |
| Audit cleanup | Original cleans old audit logs. | Missing. | Add guarded POST endpoint. |
| Dashboard chart data | Original builds monthly submissions and daily audit activity. | Missing. | Add aggregate arrays in summary endpoints. |
| Reviewer performance data | Original partially fake. | Missing. | Add real avg review time, completion rate, this-month count; defer quality score if no source. |
| Review deadlines | Original had overdue review logic. | Japr has reviewer deadline fields from latest task. | Use deadline fields in admin/reviewer summaries. |
| Count query performance | Laravel uses server aggregates. | Japr loads lists. | Use Drizzle aggregate queries with `count`, grouping, and bounded limits. |

## UI Components To Add Or Extend

| Component | Purpose |
|---|---|
| `app/components/dashboard/DashboardStatCard.vue` | Shared icon/count/label card used by admin/editor/reviewer/author where Bootstrap dashboard styling is used. |
| `app/components/dashboard/DashboardSummaryError.vue` | Small retry/error callout for failed summary fetches. |
| `app/components/dashboard/DashboardCalendarPanel.vue` | Lightweight dashboard calendar/date panel if exact Laravel calendar is in scope. |
| `app/components/dashboard/EditorStatusReference.vue` | Editor landing status legend. |
| `app/components/dashboard/ReviewerAssignmentCards.vue` | Embedded reviewer assignment cards with filters, badges, and CTAs. |
| `app/components/dashboard/AdminHealthCard.vue` | System health score and checks. |
| `app/components/dashboard/AdminDistributionPanel.vue` | Status and role distribution panels. |
| `app/components/dashboard/SimpleTrendChart.vue` | Dependency-free trend visualization if no chart library is added. |

## Test / Verification Coverage Needed

| Area | Verification |
|---|---|
| Status visibility | Tests prove `desk_review` and legacy `pending` appear in editor desk/pending summary. |
| Summary endpoints | API tests for admin/editor/reviewer summaries with seeded data. |
| Audit | Tests for log creation, risk classification, filtering, export authorization, cleanup guard. |
| Reviewer metrics | Tests for avg review time, completion rate, overdue/urgent badges. |
| Homepage stats | Test or manual verification that `/api/stats` values render instead of constants. |
| Role access | Manual role matrix for admin, editor-in-chief, managing editor, copy desk, associate editor, external reviewer, desk editor, author. |
