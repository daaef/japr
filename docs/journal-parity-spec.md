# Journal Parity Spec

Source: `C:\Users\reala\Creations\journal` (Laravel 11 Blade monolith)  
Target: `c:\Users\reala\Projects\japr` (Nuxt 4 + Nitro standalone)

## Hard rules

1. Journal is the only UI/design reference — not japr's Nuxt UI components.
2. Exact parity: layouts, HTML classes, copy, nav items, editorial board text.
3. All dev email → `EMAIL_TRANSPORT=local` → `.data/mail/*.json`.
4. Nitro replaces Laravel entirely; realtime via SSE + polling.

---

## Layouts (5)

| Laravel | Nuxt layout | Used by |
|---------|-------------|---------|
| `components/layouts/layout.blade.php` | `app/layouts/public.vue` | Public + author pages |
| `components/layouts/auth_layout.blade.php` | `app/layouts/auth.vue` | Login, register, activate, reset |
| `components/layouts/editor_layout.blade.php` | `app/layouts/editor.vue` | Editor dashboard + queues |
| `components/layouts/reviewer_layout.blade.php` | `app/layouts/reviewer.vue` | Reviewer dashboard + review form |
| `components/layouts/admin_layout.blade.php` | `app/layouts/admin.vue` | Admin CRUD |

---

## Route map (summary)

### Public
- `GET /` → `index.vue` — homepage with category tree + hero
- `GET /journals` → `journals/index.vue` — search/browse
- `GET /journals/view/{slug}` → `journals/[slug].vue` — abstract detail
- `GET /editorial` → `editorial/index.vue` — editorial board (hardcoded NCCU)
- `GET /contact`, `/privacy`, `/terms`, `/review-policy` → static pages
- `GET /interests` → `author/interests.vue`

### Auth
- `/auth/login`, `/auth/register`, `/auth/activate-account`, `/auth/forgot-password`, `/auth/reset-password`
- Success pages: success_activation, success_reset_request, success_reset

### Author (`/dashboard/*`, role: author)
- Dashboard, submit-manuscript, submissions, settings, version history, feedback, download

### Editor (`/editor/*`, roles: managing_editor, editor_in_chief)
- Dashboard, journal queues (pending, under-peer-review, in-progress, reviewed, ready-for-notice, approved, revision-requested, declined)
- Regional assignment, assign reviewers, editorial decisions, version control

### Reviewer (`/reviewer/*`, roles: associate_editor, desk_editor)
- Dashboard, queues, enhanced review form, accept/decline/submit-review

### Admin (`/admin/*`, role: admin)
- Dashboard, categories/subcategories/sub-subcategories CRUD, users, roles, permissions

---

## Models → Drizzle tables

| Laravel model | Drizzle table | Notes |
|---------------|---------------|-------|
| User | users | + accounts (Better Auth) |
| Journal | journals | approval_status workflow |
| Category / SubCategory / SubSubCategory | categories, sub_categories, sub_sub_categories | 3-level taxonomy |
| Reviewer | reviewers | assignment + enhanced review fields |
| ManuscriptVersion | manuscript_versions | version history |
| MyJournalCollection | my_journal_collections | author collections |
| UserInterest | user_interests | post-registration interests |
| Activation | activations | 6-digit email codes |
| JournalLike / DislikeJournal | journal_likes / journal_dislikes | engagement |
| JournalComment | journal_comments | comments |
| Approval | approvals | legacy approval rows |
| Country / Region | countries / regions | geography |
| Role / Permission | roles / permissions / user_roles / role_permissions | RBAC |
| notifications | notifications | in-app + SSE |

---

## Seed order (match DatabaseSeeder)

1. RoleAndPermissionSeeder — 8 roles, 25+ permissions
2. CategoriesTableSeeder — ~86 categories
3. SubCategoriesTableSeeder — one subcategory per category (same name)
4. SubSubCategoriesSeeder — one sub-subcategory per subcategory
5. UsersTableSeeder — 6 users, password `password`
6. CountriesTableSeeder — 9 regions, ~80 countries
7. ReviewersTableSeeder — afe@, nani@ (password `password`)
8. AssociateEditorSeeder — 8 regional editors (password `password123`)
9. TestJournalSeeder — 8 pending manuscripts
10. Post-seed: generate abstract PDFs (optional script)

### Seed credentials

| Email | Role | Password |
|-------|------|----------|
| admin@example.com | Admin | password |
| editor@example.com | Editor in Chief | password |
| managing@example.com | Managing Editor | password |
| author@example.com | Author | password |
| associate@example.com | Associate Editor | password |
| desk@example.com | Desk Editor | password |
| afe@example.com | Associate Editor | password |
| nani@example.com | Associate Editor | password |
| sarah.johnson@example.com … emma.thompson@example.com | Associate Editor | password123 |

---

## approval_status workflow

```
pending → under_peer_review → in-progress → reviewed
  → ready_for_managing_editor_notice → approved / declined / revision_requested
```

Also used: `changes_requested`, `approved_with_comment`, `rejected`, `in_progress` (legacy variants).

---

## Email templates (→ .data/mail)

| Template | Trigger |
|----------|---------|
| Activation (6-digit) | sign-up |
| Welcome | activate |
| Password reset | Better Auth |
| Manuscript submission | submit manuscript |
| Reviewer invitation | assign reviewers |
| Review submitted | submit review |
| Status change / decision | approve/reject/revisions/notice |
| Revision uploaded | author upload revision |
| Change requested / resolved | editor request / author update |
| Registration | sign-up notification |

---

## Realtime

Laravel: Echo private channel `notifications.{userId}` + polling fallback.  
Nuxt: SSE `/api/notifications/stream` + `useNotifications` composable with 5s polling fallback.

---

## Known Laravel gaps (implement in Nitro)

- `JournalController@manuscriptFeedback` — route exists, method missing
- `JournalController@authorUpdate` — logic in repository
- `JournalController@requestChange` — logic in repository
- `JournalController@declineJournalWithComment` — logic in repository
- Unprotected dev routes (`/migrate`, `/seed`) — do NOT port

---

## Assets copied from journal

- `public/images/` — logo, favicon, headerImg, category tiles
- `public/assets/` — Bootstrap dashboard CSS/JS, Phosphor icons
- `app/assets/journal/sass/` — public site styles
- `tailwind.journal.config.js` — reference color tokens

---

## UI brand tokens

- Primary orange: `#ff830c` (500)
- Secondary coral: `#ea5f49` (500)
- Font: Montserrat

---

## EloquentJournalRepository methods to port

create, submitManuscript, update, destroy, findById, getAll, findByUUID, getUserSubmissions, searchJournal, likeJournal, dislikeJournal, findBySlug, approveJournal, requestChange, authorUpdate, approveForPublication, rejectManuscript, requestRevisions, submitReview, uploadRevision, getJournalsReadyForNotice, sendApprovalNotice, sendDeclineNotice, getVersionHistory, compareVersions, getVersionDetails, revertToVersion, + all queue getters by role/status.
