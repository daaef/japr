# Tasks index

Master parity doc: [`docs/PARITY_MASTER.md`](../PARITY_MASTER.md)  
Flow verification: [`docs/FLOW_VERIFICATION_REPORT.md`](../FLOW_VERIFICATION_REPORT.md)  
Select/dropdown inventory: [`docs/SELECT_DROPDOWN_INVENTORY.md`](../SELECT_DROPDOWN_INVENTORY.md)

Reference app: `C:\Users\reala\Creations\journal`

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
