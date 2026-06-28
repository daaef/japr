# Journal (Laravel) → JAPR (Nuxt) parity matrix

Reference app: `C:\Users\reala\Creations\journal`  
Target app: `C:\Users\reala\Projects\japr`

**Intentional differences:** Nuxt/Nitro APIs, better-auth, local mail (`.data/mail`), `/author` prefix instead of `/dashboard`.

**Permission naming divergence:** Laravel's `assign-associate-editors` permission is intentionally represented as `assign-reviewers` in JAPR because reviewer assignment covers associate editors and external reviewers through the same editorial workflow.

## System parity status

| # | System | Structure | Layout | Flow | Styling | Notes |
|---|--------|-----------|--------|------|---------|-------|
| 1 | Identity / RBAC | Done | Done | Done | N/A | Wrong-role redirect to `/`; policy gate on author/reviewer paths |
| 2 | Public marketing / legal | Done | Done | Done | Done | Homepage matches welcome.blade.php; Preline navbar |
| 3 | Auth lifecycle | Done | Done | Done | Done | Register form matches original field order, styling, CountrySelect, registerImg |
| 4 | Review policy | Done | Done | Done | Done | Accept API + middleware gate |
| 5 | Journals catalogue | Done | Done | Done | Done | Sidebar accordions match journals.blade.php; approved-only search |
| 6 | Document preview | Done | Done | Done | Done | Upload + secured doc-preview API |
| 7 | Author workspace | Done | Done | Done | Done | Dashboard, submit taxonomy cascade, interests gate, download |
| 8 | Editor workflow | Done | Done | Done | Follow-up | Queue APIs fixed; notice actions wired |
| 9 | Regional assignment | Done | Done | Done | Done | Suggestions + assign on editor journal detail |
| 10 | Reviewer workflow | Done | Done | Done | Follow-up | Request-change form wired |
| 11 | Admin console | Done | Done | Done | Follow-up | Settings uses `SettingsForm` |
| 12 | Notifications | Done | Done | Done | Done | Stats cards, dropdown, preferences enforced on email, CSV, SSE |

Detailed continuous checklist: `docs/journal-full-parity-checklist.md`  
Master goals & verification: `docs/PARITY_MASTER.md`, `docs/FLOW_VERIFICATION_REPORT.md`

## Workflow status vocabulary

| Journal | JAPR |
|---------|------|
| `under_peer_review` | `under_peer_review` |
| `ready_for_managing_editor_notice` | `ready_for_managing_editor_notice` |
| `in-progress` / `in-review` | `in-progress` |
| `reviewed` | `reviewed` |

Migration: `server/db/migrations/0001_workflow_statuses.sql`

## CSS architecture

| Layer | Laravel | JAPR |
|-------|---------|------|
| Public tokens | `tailwind.config.js` primary/secondary | `app/assets/css/main.css` `@theme` |
| Public components | `style.scss` + layout inline | `journal.css` + `journal-layout-extras.css` |
| Public JS | Preline `HSStaticMethods.autoInit()` | `app/plugins/preline.client.ts` |
| Dashboard | `main.scss` + Bootstrap + layout inline | `public/assets/css/main.css` + `journal-dashboard-overrides.css` |

## Layout mapping

| Laravel | JAPR | Status |
|---------|------|--------|
| `layout.blade.php` | `layouts/public.vue` | Done |
| `auth_layout.blade.php` | `layouts/auth.vue` | Done |
| `admin_layout.blade.php` | `layouts/admin.vue` | Done |
| `editor_layout.blade.php` | `layouts/editor.vue` | Done |
| `reviewer_layout.blade.php` | `layouts/reviewer.vue` | Done |

## Component mapping

| Laravel | JAPR |
|---------|------|
| `navbar.blade.php` | `JournalNavbar.vue` |
| `user-navbar.blade.php` | `JournalUserNavbar.vue` |
| `footer.blade.php` | `JournalFooter.vue` |

## Verification checklist (per page)

1. Open Laravel and JAPR URLs side by side.
2. Compare computed styles on navbar, primary CTAs, forms.
3. Test 375px / 1024px / 1440px widths.
4. Mobile menu (Preline collapse) and user dropdown.
5. Author tabs on `/author/*` when logged in.

## N/A (no public UI parity required)

- Mail templates under `resources/views/emails`
- Vendor views
- Dev Artisan routes in `web.php`
