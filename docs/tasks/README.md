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
| nuxt-ui-unification | 20260708 | done | Track 1: faithful migration of every page off Bootstrap/jQuery/Preline onto Nuxt UI (W0–W6), DoD grep = 0, `pnpm build` green. Track 2 (redesign) remains gated |
| ui-consistency-pass | 20260710 | done | Post-Track-1 consistency pass: unified card-header/spacing/color-token/card-usage patterns app-wide (new AppEmptyState/ReviewerReviewPerformanceCard, author dashboard restructure + author-layout routing fix, editorial page migrated); also found + corrected a real W6 CSS-deletion mistake |
| review-consensus | 20260713 | done | Peer-review decisions driven by a 3-reviewer consensus instead of a count-of-2: new pure `getReviewConsensus`/`hasReviewQuorum` + `REVIEW_QUORUM=3`; status waits for all reviews; reviewers can no longer unilaterally set `changes_requested` (suggestion surfaced to managing editor, who confirms every terminal decision); approve gate raised to 3. 65/65 unit tests green |
| consent-schema-hardening | 20260713 | done | (no folder — follow-up to review-consensus) `journalCreateSchema` consent made required: `agree` must be literal `true`, `accept` a required boolean (were both `.default(true)`, silently bypassable). Enforced at the create-parse; PATCH `.partial()` and the submit form `.omit()` unaffected. Smoke-tested |
| editor-consensus-ui | 20260713 | done | (no folder — follow-up to review-consensus) Editor manuscript page surfaces the advisory consensus suggestion + "quorum not met, assign a replacement" prompt from the detail API |
| role-list-centralization | 20260713 | done | Collapsed duplicated role-name lists (permissions.ts require*/isEditorRole/isReviewerRole, journals create + download endpoints, editorNotifications.ts ×5) onto `shared/constants/roles.ts`; drift-guard test added. Pure refactor, 66/66 green |
| review-notification-timing | 20260713 | done | Reviewer `request-change` no longer notifies the author prematurely; records suggestions + notifies editors (new `notifyEditorsOfReviewerSuggestions`). Author hears once, when the editor requests revisions. 66/66 green |
| send-to-review-notifications | 20261004 | done | EIC sending to review now notifies users with `reviewer:assign`; dashboard alerts scoped by `journal:approve` / `reviewer:assign` permissions |
| revision-file-versioning | 20261004 | done | Snapshot manuscript file URL per version so revisions can be previewed/downloaded independently of the current journal file |
| promote-copy-desk-collapse-desk-review | 20261004 | implemented | Promote copy desk editor to full editorial role (deputy admin for workflow); collapse desk review — new submissions start at in_progress; remove send-to-review and desk-decline |
| configurable-permissions | 20261004 | implemented | Fix admin permissions UI (revoke support), migrate coarse role-name guards to permission-based checks, fix admin bypass, audit bare-session endpoints, clean up dead code |
| ping-nudge-system | 20261004 | implemented | Preset role-aware ping/nudge messages: editors can send templated nudges to reviewers/authors/other editors in manuscript context; 4-hour cooldown dedup; permission-gated (ping:send); delivered via existing notification + email infrastructure |
| promote-desk-editor | 20261010 | superseded | Not implemented — superseded by `collapse-desk-editor-role` after the stakeholder confirmed desk_editor and copy_desk_editor are meant to be the same role |
| collapse-desk-editor-role | 20261010 | done | Retired `desk_editor` as a distinct role; anyone who held it now holds `copy_desk_editor` (already full editorial-workflow permissions from the 2026-10-04 promotion). 9 hardcoded role-list call sites + seed data updated; migration moves existing assignments and soft-deactivates the role |
| docx-standardization | 20261010 | done | (no folder) Resolved the DOCX-in-production gap by standardizing on `.docx` instead of adding PDF auto-conversion infrastructure: `.doc` removed from `getAllowedMimeTypes()` default + `.env` + upload UI accept/copy (`application/msword` was accepted but had zero preview capability via Mammoth). Added `tests/docPreview.test.ts` confirming the Mammoth DOCX→HTML conversion against a real fixture file (`tests/fixtures/sample.docx`, gitignored-by-convention local fixture, test skips cleanly if absent) |
| first-run-admin-setup | 20261011 | planned | Design for a one-time "create the first admin" setup screen shown when zero admin-role users exist, replacing the need for a hardcoded seeded admin account. Not implemented yet — see problem.md/plan.md for the design (advisory-locked bootstrap endpoint, in-memory needsSetup cache, new /auth/setup route) |
| africa-only-manuscript-country | 20261011 | done | (no folder) Found during manual testing: a manuscript's country of origin and the author's own profile country were using the same unrestricted global list. Added `regions.isAfrican`, scoped the manuscript submission's `CountrySelect` to Africa, and enforced it server-side in both journal create and update endpoints (previously any string passed server-side validation) |
| two-of-three-auto-resolve | 20261011 | done | Manuscripts now auto-approve/decline the moment 2 of 3 reviewers agree, with no editor click and without waiting for the 3rd reviewer — a deliberate, confirmed policy change (fully automatic was chosen over "just unlock the editor's decision early"). Partially supersedes `review-consensus` (20260713) for this one case; 3-reviewer pool and split/revision handling unchanged. New `getEarlyConsensus`/`finalizeByReviewerConsensus`, UNDER_PEER_REVIEW→APPROVED/DECLINED legalized, distinct auto-decision audit actions, editor-visibility notification added to close a gap the manual path doesn't have |
| editorial-board-admin | 20261011 | done | Editorial board moved from a hardcoded static file to an admin-editable table (`/admin/editorial-board`). Sections are free text, not fixed roles, so a new section (e.g. a future Book Review Editors group) needs no code change — the public page and homepage teaser both already read generically by section. Carried over the 9 real current board members via migration |
