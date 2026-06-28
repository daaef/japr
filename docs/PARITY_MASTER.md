# JAPR ↔ Journal parity — master document

**Last updated:** 2025-06-17  
**Reference application (source of truth):** `C:\Users\reala\Creations\journal`  
**Target application:** `C:\Users\reala\Projects\japr`  
**Architecture spec:** `academic-journal-spec.md` (Nuxt 4 + Nitro + Drizzle + Better Auth)

> **Canonical reference path:** All future comparisons — routes, flows, Blade templates, controllers, code quality — use **`C:\Users\reala\Creations\journal`**. The older `Projects\journal` path is deprecated.

---

## 1. What we are trying to achieve

JAPR is a **full reimplementation** of the Laravel 11 academic journal app. The goal is **functional and flow parity** with the reference app: the same roles, manuscript lifecycle, notifications, search, and editorial workflows must work end-to-end. Visual polish (spacing, tokens, pixel-perfect Blade match) is tracked separately; **this programme prioritises flows that work**, especially every **dropdown, select, and cascading picker** that drives real data.

### Success criteria

| Layer | Goal | Status |
|-------|------|--------|
| **Structure** | Same pages, layouts, nav items, role gates | Largely done — see `parity-matrix.md` |
| **Flow** | Happy paths + key failure paths match Laravel behaviour | In progress — see `FLOW_VERIFICATION_REPORT.md` |
| **Data** | Same schema concepts, workflow statuses, seed data | Done (Drizzle + migrations) |
| **Integrations** | Email (local/Resend), file upload, doc preview, SSE notifications | Done |
| **Styling** | Blade-class parity on public + dashboard shells | Separate UI/UX task |

### Non-goals (intentional divergences)

| Topic | Journal (Laravel) | JAPR |
|-------|-------------------|------|
| Auth | Laravel session | Better Auth (`/api/auth/*`) |
| Author URLs | `/dashboard/*` | `/author/*` |
| Realtime | Laravel Echo / Pusher | SSE (`/api/notifications/stream`) + polling |
| Email dev | Mailhog / log | `EMAIL_TRANSPORT=local` → `.data/mail/*.json` |
| Stack | PHP Blade monolith | Nuxt 4 SSR + Nitro API |

Document divergences in `parity-matrix.md` and `journal-parity-spec.md`; do not “fix” them unless explicitly requested.

---

## 2. Reference map — where to look in Journal

| Concern | Journal path |
|---------|----------------|
| Routes | `routes/web.php` |
| Controllers | `app/Http/Controllers/` |
| Workflow / repositories | `app/Repositories/Journal/EloquentJournalRepository.php` |
| Blade layouts | `resources/views/components/layouts/` |
| Author submit | `resources/views/user/submit-manuscript.blade.php`, `JournalController.php` |
| Interests | `resources/views/interests.blade.php`, `UserInterestController.php` |
| Editor queues | `resources/views/dashboard/editor/` |
| Reviewer review | `resources/views/dashboard/reviewer/journals/enhanced-review.blade.php` |
| Notifications | `app/Http/Controllers/NotificationController.php`, `resources/views/notifications/` |
| Search | `resources/views/journals.blade.php`, `welcome.blade.php`, `EloquentJournalRepository::searchJournal` |
| Categories | `app/Http/Controllers/CategoryController.php`, admin category views |
| Seed data | `database/seeders/` |

### JAPR counterpart index

| Concern | JAPR path |
|---------|-----------|
| Pages | `app/pages/` |
| Layouts | `app/layouts/` |
| API | `server/api/` |
| Schema | `server/db/schema/` |
| Shared validation | `shared/validation/` |
| Parity docs | `docs/` (this file, `parity-matrix.md`, `journal-parity-spec.md`) |

---

## 3. Work completed (parity programme)

Chronological task folders under `docs/tasks/`:

| Slug | Summary |
|------|---------|
| `parity-gaps` | Journal download, author dashboard, interests gate, notification prefs + CSV export, version links |
| `parity-quick-wins` | Interests redirect, navbar workspace paths, OAuth → `/author`, download auth, sidebar links |
| `parity-medium` | Notification header dropdown, submit category → sub → sub-sub cascade |
| `parity-notifications` | Stats API + dashboard cards, email preference enforcement on editorial mail |

### Notifications parity (vs `NotificationController.php`)

| Laravel | JAPR | Status |
|---------|------|--------|
| `getDropdownNotifications` | `GET /api/notifications/dropdown` | Done |
| `getUnreadCount` | `GET /api/notifications/unread-count` | Done |
| `getRealTimeStats` | `GET /api/notifications/stats` | Done |
| `index` / `dashboard` | `GET /api/notifications` + stat cards on `/notifications` | Done (filters simplified) |
| `preferences` / `updatePreferences` | `/notifications/preferences` + PATCH | Done |
| `export` | `GET /api/notifications/export` | Done |
| Email `via()` preference check | `sendIfEmailAllowed()` in `server/utils/notificationPreferences.ts` | Done |
| `frequency` batching / `weekly_summary` | Not implemented | Open |

### Author submit taxonomy (vs `submit-manuscript.blade.php`)

| Field | Journal | JAPR |
|-------|---------|------|
| `country` | Grouped select (`globalRegions`) | `CountrySelect` → `GET /api/countries` |
| `journal_language` | 3 options | Hardcoded same 3 options |
| `category_id` | Select + `/load-subcategories` cascade | Select + nested `GET /api/categories` + Vue watchers |
| `subcategory_id` | Required when shown | Required when category has children |
| `sub_sub_category_id` | Optional in DB | Optional select when sub has children |

**JAPR is ahead of Journal** on full 3-level submit cascade; Journal only cascades category → subcategory via AJAX.

---

## 4. Flow-first focus (current programme)

UI/UX polish is a **separate task**. Until then, every flow below must **work** (correct options load, cascade clears children, POST body matches API, server persists and transitions status).

### Priority flows

1. **Auth** — register → activate → login → role redirect → interests gate (first save only)
2. **Author** — submit manuscript (file + taxonomy + policy) → track submission → revision → download
3. **Editor** — queue by status → preview → assign reviewers → decisions → notices → publication
4. **Reviewer** — accept/decline → enhanced review → request change
5. **Public** — homepage category search → `/journals` results → abstract detail → like/collection
6. **Notifications** — dropdown, list, stats, preferences, email gating
7. **Admin** — users, roles, categories (minimum: create top-level; sub-tree APIs exist)

### Dropdown / select inventory

Full cross-reference: **`docs/SELECT_DROPDOWN_INVENTORY.md`**

---

## 5. Known flow gaps (verified 2025-06-17)

Verified by code comparison with `C:\Users\reala\Creations\journal`. **Fix in flow programme before UI task.**

| # | Gap | Journal reference | JAPR | Severity |
|---|-----|-------------------|------|----------|
| 1 | Homepage subcategory/sub-subcategory search | `EloquentJournalRepository.php` | `search.get.ts` filters | **Fixed** |
| 2 | License filter | `searchJournal` | JSON `ILIKE` match | **Fixed** |
| 3 | `/journals` sidebar vs homepage | Flat vs tree (both apps) | URL params forwarded | **OK** |
| 4 | Admin user country | `country-options` | `CountrySelect` | **Fixed** |
| 5 | Admin subcategory UI | Incomplete in Journal | Parent selects + cascade on `/admin/categories` | **Fixed** |
| 6 | Interests clear-all | — | Client guard | **Fixed** |
| 7 | Contact phone country | Hardcoded in Blade | Hardcoded 5 countries, not `/api/countries` | **Low** |
| 8 | `frequency` email batching | Stored, not fully queued in Laravel either | Same — immediate send only | **Low** |

---

## 6. Manuscript workflow (shared vocabulary)

Primary field: `journals.approval_status`

```
pending → in-progress / in-review → under_peer_review → reviewed
  → ready_for_managing_editor_notice → approved / declined / changes_requested
```

Journal transitions: `EloquentJournalRepository.php`, `EloquentReviewerRepository.php`, editor routes in `routes/web.php` (`editor.journals.*`).

JAPR transitions: `server/api/editor/journals/[uuid]/*.post.ts`, `server/api/reviewer/journals/*.post.ts`, `server/utils/journalWorkflow.ts`.

---

## 7. Verification protocol

Before marking a flow **done**:

1. Read Journal Blade + controller for the flow (`C:\Users\reala\Creations\journal`)
2. Trace JAPR page → API → DB (`C:\Users\reala\Projects\japr`)
3. Confirm every `<select>` / dropdown has a populated options source and correct POST/query payload
4. Run `pnpm typecheck`
5. Manual smoke: one happy path per role (seed users in `journal-parity-spec.md`)

Detailed checklist: `docs/FLOW_VERIFICATION_REPORT.md`  
Visual checklist (separate task): `docs/journal-full-parity-checklist.md`

---

## 8. Document index

| File | Purpose |
|------|---------|
| `docs/PARITY_MASTER.md` | This file — goals, reference paths, status |
| `docs/FLOW_VERIFICATION_REPORT.md` | Verification results vs Creations/journal |
| `docs/SELECT_DROPDOWN_INVENTORY.md` | Every select/dropdown cross-walk |
| `docs/parity-matrix.md` | System-level done/partial matrix |
| `docs/journal-parity-spec.md` | Routes, models, seeds, email map |
| `docs/journal-full-parity-checklist.md` | Manual visual QA (UI task) |
| `docs/tasks/README.md` | Implementation task index |
| `academic-journal-spec.md` | Greenfield architecture spec |

---

## 9. Seed credentials (smoke testing)

Use Journal / JAPR seed users (password `password` unless noted):

| Email | Role |
|-------|------|
| `author@example.com` | Author |
| `editor@example.com` | Editor in Chief |
| `managing@example.com` | Managing Editor |
| `associate@example.com` | Associate Editor |
| `admin@example.com` | Admin |

Run Journal: `php artisan serve` from `C:\Users\reala\Creations\journal`  
Run JAPR: `pnpm dev` from `C:\Users\reala\Projects\japr`
