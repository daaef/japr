# Tasks index

Master parity doc: [`docs/PARITY_MASTER.md`](../PARITY_MASTER.md)  
Flow verification: [`docs/FLOW_VERIFICATION_REPORT.md`](../FLOW_VERIFICATION_REPORT.md)  
Select/dropdown inventory: [`docs/SELECT_DROPDOWN_INVENTORY.md`](../SELECT_DROPDOWN_INVENTORY.md)

Reference app: `C:\Users\reala\Creations\journal`

## Platform hardening roadmap (2026-07-03)

Six-phase plan closing the findings from a full-system audit of auth/onboarding, peer review, journal search, and Vercel Blob uploads. Sequencing below reflects real dependencies (a later phase reuses a helper/pattern a phase before it builds) — phases without a listed dependency can run in parallel.

| Phase | Slug | Depends on | Why |
|---|---|---|---|
| 1 | `auth-identity-hardening` | — | Blocking: every self-registered user currently gets no role and no dashboard. **Done.** |
| 2 | `manuscript-visibility-unification` | — | Independent; closes the reviewer-identity leaks. **Done.** |
| 3 | `review-state-guards` | Phase 2 | Touches the same `server/api/reviewer/journals/` files; land the read-path fix first. **Done.** |
| 4 | `upload-ownership-safety` | — | Independent; can run alongside 2/3. **Done.** |
| 5 | `journal-search-consolidation` | Phase 2 | Unified query-builder calls Phase 2's shared visibility function. **Done.** |
| 6 | `operational-hardening` | Phase 4 | Extends Phase 4's cleanup job into a general scheduled-job runner. **Done.** |

Each phase folder below has `problem.md` / `plan.md` / `solution.md` (pre-implementation) and gets a `changelog.md` once the code lands.

| Slug | Date | Status | Summary |
|------|------|--------|---------|
| parity-gaps | 20250617 | done | P1 Laravel parity: download, author dashboard, interests gate, notification preferences/export, version links |
| parity-quick-wins | 20250617 | done | Round 2: interests redirect, navbar paths, OAuth callback, download auth, sidebars |
| parity-medium | 20250617 | done | Notification dropdown + submit taxonomy cascade; unread count fix |
| parity-notifications | 20250617 | done | Notification stats dashboard + email preference enforcement |
| flow-parity-sync | 20250617 | done | Search subcategory/license filters, admin CountrySelect, interests guard |
| flow-parity-recheck | 20250617 | done | Search searchType API param, admin sub/sub-sub category forms |
| flow-parity-pass3 | 20250617 | done | Interests max 5, register institution required, category active status |
| flow-parity-pass4 | 20250617 | done | Notification type/status select filters + CSV type filter |
| flow-parity-pass5 | 20250617 | done | Settings hydration, auth activation, editor prefs, invitation URLs, copy desk access |
| flow-parity-pass6 | 20250617 | done | Reviewer queue shape, in-app accept/decline, copy desk preview, notification links |
| flow-parity-pass7 | 20260617 | done | Admin taxonomy CRUD: sub/sub-sub edit+delete APIs, category status toggle, inline admin UI |
| visual-parity-dashboards | 20260618 | done | Dashboard stat-card anatomy (icon circles) for editor/reviewer/admin; reviewer 2→5 cards; status badge active/suspended mapping |
| reviewer-confidentiality | 20260626 | done | Author-facing submission details and feedback now use sanitized reviewer projections that hide reviewer identity and confidential comments |
| workflow-integrity | 20260626 | done | Review completion, revision requests, approval, and publication approval now share guarded workflow rules |
| manuscript-state-machine | 20260626 | done | Added shared manuscript status constants, labels, colors, groups, transitions, and refactored key workflow callers |
| notifications-roles | 20260626 | done | Split editorial mutation guards by permission and added neutral author status notifications for assignment and review sync |
| desk-publication | 20260626 | done | Added desk review and published statuses, migrations, desk decision endpoints, assignment gating, and copy-desk publication |
| reviewer-deadlines | 20260626 | done | Added reviewer deadline fields, default due dates, and extension request/approval endpoints |
| notification-preferences | 20260626 | done | Realtime in-app notification preference now gates SSE notification publishing while preserving notification rows |
| hygiene-parity | 20260626 | done | Removed dead approvals schema, strengthened password policy, consolidated signup role assignment, and documented permission rename |
| audit-log-deferred | 20260626 | deferred | Audit log remains scope-gated for later explicit approval; no runtime audit subsystem added |
| dashboard-perfect-parity | 20260627 | in_progress | Full dashboard parity plan covering role landing pages, workflow visibility, admin analytics, audit, public stats, and verification |
| mail-viewer | 20260628 | done | Public `/mail` inbox when `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`; navbar + registration/activation links |
| vercel-auth-origin | 20260628 | done | Better Auth trusted origins for `japr.vercel.app` / Vercel previews; README deployment env checklist |
| vercel-smtp-mailtrap | 20260629 | done | Generic SMTP (nodemailer) transport for Vercel email, Mailtrap-backed `/mail` viewer, atomic + email-tolerant signup (fixes 500→409 trap) |
| vercel-uploads-blob | 20260629 | done | Pluggable `STORAGE_DRIVER` (local\|Vercel Blob) for manuscript uploads/downloads/preview; PDF-first on Vercel; opaque key keeps files private |
| upload-token-500 | 20260701 | done | Fix Vercel direct upload: drop forced MPU, exempt upload-token from auth middleware, surface Blob errors |
| auth-identity-hardening | 20260703 | done | Sign-up routed through better-auth's own API (uniform role/activation-code assignment), activation expiry+attempt-limit, corrected rate-limit paths, Google onboarding redirect, server-side interests/review-policy gates; also fixed two pre-existing bugs (orphaned admin_audit_logs migration, uuid generateId crash on all user creation) found during verification |
| manuscript-visibility-unification | 20260703 | done | Shared `projectJournalForViewer` (public/owner/reviewer/editor) replaces four drifted per-endpoint filters; non-public manuscripts 404 for non-owners; changeRequests actor-id scrub; reviewer peer-isolation (co-reviewer identities + editor-only rating field) |
| review-state-guards | 20260703 | done | Reviewer-assignment status transitions guarded (no submit before accept, no resubmission, no decline after reviewed); request-change now requires assignment + non-terminal manuscript status; assign-reviewers conflict-of-interest check; reviewer-status constants replace conflated/raw-literal comparisons |
| upload-ownership-safety | 20260703 | done | New `files` ownership table binds every storage key to its uploader at upload time (both drivers); journal create/revision verify ownership before saving journalUrl; local-driver path-traversal fix; admin-triggered orphaned-upload cleanup; upload-token rate limit |
| journal-search-consolidation | 20260703 | done | Fixed permanently-broken pagination (totalPages/pageCount mismatch); unified index/search query-builder; search_vector migrated to a generated tsvector+GIN column (word/stem matching, not substring — flagged); subcategory/sub-subcategory filter UI; license field; pagination on 9 editor queues + admin journals page |
| operational-hardening | 20260703 | done | First scheduled-execution mechanism in the app (Vercel Cron + CRON_SECRET auth); daily orphaned-upload cleanup (manual admin endpoint kept as escape hatch); reviewer deadline-reminder job with re-check-before-send and remindedAt dedup; rate limits on manuscript creation + 5 reviewer decision endpoints |
| full-project-review | 20260704 | in_progress | Full code/GUI/flow/design-system review: issues catalog (`problem.md`) + 6-phase remediation roadmap (`plan.md`) — storage privacy, flow guards, server hardening, workflow correctness, frontend consolidation, design-system unification; flags two regressions vs. earlier "done" hardening tasks. Phases 1–5 landed (Phase 6 design-system unification remains) |
