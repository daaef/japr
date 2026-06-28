# Flow verification report

**Date:** 2025-06-17  
**Reference:** `C:\Users\reala\Creations\journal`  
**Target:** `C:\Users\reala\Projects\japr`  
**Scope:** Functional flow and select/dropdown behaviour (not visual parity)

---

## Verification methods run

| Check | Result |
|-------|--------|
| `pnpm typecheck` | **Pass** |
| `pnpm run build` | **Pass** |
| Route/controller cross-walk (`web.php` vs `server/api/`) | **Pass** (core routes present) |
| Notification API vs `NotificationController.php` | **Pass** |
| Submit taxonomy vs `submit-manuscript.blade.php` | **Pass** (JAPR 3-level cascade) |
| Search filters vs `EloquentJournalRepository::searchJournal` | **Pass** — subcategory, sub-subcategory, license |
| Email preference gating vs `EnhancedManuscriptStatusChangedNotification::via` | **Pass** |
| Editor workflow POST routes vs `editor.journals.*` | **Pass** |
| Reviewer enhanced review vs `enhanced-review.blade.php` | **Pass** (recommendation select wired) |

---

## Flow-by-flow verification

### Legend

- **OK** — behaviour matches or exceeds Journal
- **GAP** — functional mismatch; blocks parity
- **N/A** — no select/dropdown or diverges by design
- **UI** — works but styling deferred to UI task

### 1. Authentication & onboarding

| Step | Journal | JAPR | Status |
|------|---------|------|--------|
| Register + country select | `auth/register.blade.php` hardcoded Africa groups | `CountrySelect` + `/api/countries` | **OK** |
| Activate account | 6-digit code | Same | **OK** |
| Login redirect | Role-based dashboard | `/author`, `/editor`, etc. + interests gate | **OK** (path prefix differs) |
| Google OAuth | `GoogleController` | Better Auth social | **OK** |
| Interests (category pick) | Checkbox tiles, max 5 | Checkbox, max 5 enforced client + server | **OK** |
| Interests save empty | — | Client guard | **OK** |

**Journal files:** `RegistrationController.php`, `UserInterestController.php`, `resources/views/interests.blade.php`  
**JAPR files:** `app/pages/auth/register.vue`, `app/pages/author/interests.vue`, `server/api/author/interests.post.ts`

---

### 2. Author — submit manuscript

| Control | Journal | JAPR | Status |
|---------|---------|------|--------|
| Country | Grouped `<select>` | `CountrySelect` | **OK** |
| Language | 3-option `<select>` | Same 3 options | **OK** |
| Category | `<select>` required | `<select>` required | **OK** |
| Sub-category | AJAX `/load-subcategories` | Vue cascade from `/api/categories` | **OK** |
| Sub-sub-category | Not in submit UI | Optional cascade | **OK** (JAPR extra) |
| File upload + submit | `submit-manuscript.post` | `POST /api/journals` | **OK** |
| Policy acceptance | Gate on submit | `reviewPolicyAccepted` gate | **OK** |

**Journal:** `JournalController@submitManuscript`, `user/submit-manuscript.blade.php`  
**JAPR:** `app/pages/author/submit.vue`, `server/api/journals/index.post.ts`

---

### 3. Author — dashboard & submissions

| Flow | Journal | JAPR | Status |
|------|---------|------|--------|
| Stats cards | `user/dashboard.blade.php` | `author/index.vue` | **OK** |
| Recent submissions | Yes | Yes | **OK** |
| Collections grid | Yes | Yes | **OK** |
| Submission detail + download | Download route | `GET /api/journals/:id/download` | **OK** |
| Version history link | Yes | Link to `/journals/[slug]/versions` | **OK** |

---

### 4. Public — search & discovery

| Control / flow | Journal | JAPR | Status |
|----------------|---------|------|--------|
| Homepage 3-level category tree | `welcome.blade.php` | `index.vue` DOM cascade | **OK** (UI) |
| Homepage → journals query | `category`, `subcategory`, `subsubcategory[]` | Same query params sent | **OK** |
| Server applies subcategory filter | `whereIn('sub_category_id', …)` (array only) | `inArray` — single or array | **OK** |
| Server applies sub-subcategory filter | `whereIn('sub_sub_category_id', …)` | `inArray` on `subSubCategoryId` | **OK** |
| `/journals` category checkboxes | Flat `category[]` | Flat from `/api/categories` | **OK** |
| Country filter | `globalRegions` checkboxes | `/api/countries` checkboxes | **OK** |
| Language filter | Checkboxes (some lack `name` in Journal) | Checkboxes wired | **OK** |
| License filter | `whereIn('license', …)` | `ILIKE` on JSON text | **OK** |
| Search type select | Cosmetic in Journal | Wired (`title` vs `keyword`) | **OK** (JAPR ahead) |

**Journal:** `EloquentJournalRepository.php` L320–360, `journals.blade.php`  
**JAPR:** `server/api/journals/search.get.ts`, `shared/validation/journals.ts`, `app/pages/journals/index.vue`, `app/components/JournalFiltersPanel.vue`

---

### 5. Editor workflow

| Flow | Journal route | JAPR | Status |
|------|---------------|------|--------|
| Pending queue | `editor.journals.pendingApproval` | `GET /api/editor/journals/pending` | **OK** |
| Assign reviewers | `reviewerSelect` multi | Checkbox list from regional API | **OK** |
| Approve / reject / revisions | POST routes | Matching POST under `[uuid]/` | **OK** |
| Approval / decline notice | `ready_for_managing_editor_notice` gate | `assertManuscriptStatus` same gate | **OK** |
| `rejection_reason` select | UI only, not stored | Not present | **N/A** (same effective behaviour) |
| `revision_type` select | UI only, not stored | Not present | **N/A** |
| Status filter on pending table | Client-side `statusFilter` | — | **UI** (optional) |

**Journal:** `dashboard/editor/journals/journalPreview.blade.php`, `JournalController.php`  
**JAPR:** `app/pages/editor/journals/[uuid].vue`, `server/api/editor/journals/[uuid]/*`

---

### 6. Reviewer workflow

| Control | Journal | JAPR | Status |
|---------|---------|------|--------|
| Criteria ratings 1–5 | 3 criteria in Blade form | 6 criteria in API (matches controller) | **OK** |
| Recommendation | Radio buttons | `<select>` accept/minor/major/reject | **OK** |
| Request change field | — | `<select>` title/abstract/description | **OK** |
| Accept / decline | Token routes | Same concept | **OK** |
| Post-review status transition | `submitReview` logic | `submit-review.post.ts` | **OK** |

**Journal:** `enhanced-review.blade.php`, `EloquentJournalRepository::submitReview`  
**JAPR:** `app/pages/reviewer/journals/[uuid]/review.vue`, `server/api/reviewer/journals/submit-review.post.ts`

---

### 7. Notifications

| Feature | Journal | JAPR | Status |
|---------|---------|------|--------|
| Navbar dropdown | `getDropdownNotifications` | `NotificationDropdown.vue` | **OK** |
| Unread badge | `getUnreadCount` | dropdown + store | **OK** |
| Stats cards | `getRealTimeStats` / dashboard | `/api/notifications/stats` + index page | **OK** |
| List + mark read | `index`, `markAsRead` | `/notifications` + POST routes | **OK** |
| Preferences | Checkbox + frequency radio | Checkbox + frequency `<select>` | **OK** |
| CSV export | `export` | `export.get.ts` | **OK** |
| Email respects prefs | `via()` checks `notification_preferences` | `sendIfEmailAllowed` | **OK** |
| Type/status filter on dashboard | `<select>` on dashboard view | Type + Status `<select>` on `/notifications` | **OK** |

---

### 8. Admin

| Flow | Journal | JAPR | Status |
|------|---------|------|--------|
| Create category | `categories/create` + `active_status` select | Create form with Enable/Disable select | **OK** |
| Edit / disable / delete category | `categories.update` / `destroy` | Inline edit + status toggle (soft delete) | **OK** |
| Subcategory create | Missing parent select in Journal | Parent category `<select>` + POST | **OK** |
| Subcategory edit / delete | `subcategories.update` / `destroy` | Inline edit + DELETE | **OK** |
| Sub-subcategory edit / delete | `sub-subcategories.update` / `destroy` | Inline edit + DELETE | **OK** |
| User create role | `<select>` from roles | Role checkboxes | **OK** (different control, same data) |
| User country | Grouped select | `CountrySelect` | **OK** |
| Taxonomy management (full CRUD) | category/sub/sub-sub edit+delete | Full CRUD wired (pass 7) | **OK** |
| Audit user/action filters | `<select>` on audit index | — | **Not ported** (out of core parity scope) |

---

## Code quality comparison (flow layer)

| Dimension | Journal | JAPR | Notes |
|-----------|---------|------|-------|
| Validation | Form requests scattered | Zod shared client/server | JAPR stronger |
| Workflow guards | Controller + repository | `assertManuscriptStatus` | Equivalent |
| Notification prefs | Laravel `via()` channel | Explicit `sendIfEmailAllowed` | Equivalent |
| Search | Single repository method | Dedicated `search.get.ts` | Parity on all documented filters |
| Category cascade | HTMX + fetch endpoint | Single nested GET | JAPR simpler, submit OK |
| Dead UI fields | `rejection_reason` not persisted | Not copied | Good — avoid fake selects |

---

## Recommended fix order (flow programme)

1. ~~**Search API**~~ — done
2. **Homepage → results** — manual smoke with seed data
3. ~~**Admin user country**~~ — done
4. ~~**Admin category tree**~~ — done (parent selects + cascade)
5. ~~**Interests**~~ — done

---

## UI/UX task (out of scope here)

Defer to separate task:

- `docs/journal-full-parity-checklist.md` (layout, styling, breakpoints)
- Dashboard shell polish (`parity-matrix.md` “Follow-up” rows)
- Preline/Bootstrap class pixel parity

---

## Sign-off checklist

- [x] Reference path updated to `Creations\journal`
- [x] Typecheck green
- [x] Build green
- [x] Core workflow routes mapped
- [x] Search subcategory/license gaps fixed
- [x] Admin country select fixed
- [ ] Manual smoke per role documented in `PARITY_MASTER.md`
