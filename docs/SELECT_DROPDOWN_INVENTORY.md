# Select & dropdown inventory

Cross-walk between **`C:\Users\reala\Creations\journal`** (reference) and **`C:\Users\reala\Projects\japr`** (target).

**Flow status:** OK = options load and POST/query works · GAP = broken or missing · UI = control exists, styling separate · N/A = not applicable

---

## Author

| Screen | Control | Journal source | JAPR source | Options from | Cascade | Status |
|--------|---------|----------------|-------------|--------------|---------|--------|
| Submit | Country | `submit-manuscript.blade.php` | `CountrySelect` in `submit.vue` | `globalRegions()` / `GET /api/countries` | — | OK |
| Submit | Language | hardcoded 3 | `<select>` in `submit.vue` | Hardcoded | — | OK |
| Submit | Category | `category_id` | `form.categoryId` | `GET /api/categories` | Clears sub/sub-sub | OK |
| Submit | Sub-category | `/load-subcategories` | `form.subCategoryId` | Nested in categories API | From category | OK |
| Submit | Sub-sub-category | — (DB only) | `form.subSubCategoryId` | Nested in categories API | From sub-category | OK |
| Interests | Category pick | Checkbox `interests[]` | Checkbox in `interests.vue` | `GET /api/categories` | — | OK |
| Settings | Country | `country-options` | `SettingsForm.vue` | `GET /api/countries` | — | OK |

---

## Auth

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Register | Country | Hardcoded Africa optgroups | `CountrySelect` | OK |
| Login | — | — | — | N/A |

---

## Public search

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Homepage | Category tree | 3-level checkboxes | 3-level checkboxes `index.vue` | OK (client) |
| Homepage | Sub-category | `name="subcategory"` | Same | **OK** |
| Homepage | Sub-sub-category | `name="subsubcategory[]"` | Same | **OK** |
| `/journals` | Category | `category[]` flat | `JournalFiltersPanel` | OK |
| `/journals` | Country | Region checkboxes | `/api/countries` | OK |
| `/journals` | Language | Checkboxes | Hardcoded 3 | OK |
| `/journals` | License | Checkboxes | Hardcoded CC variants | **OK** |
| `/journals` | Search scope | Cosmetic (no name) | `<select>` searchType | OK |

---

## Editor

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Journal detail | Reviewer assign | `reviewerSelect` optgroups | Checkbox list | OK |
| Journal detail | Rejection reason | Modal `<select>` | — | N/A (not persisted in Journal) |
| Journal detail | Revision type | Modal `<select>` | — | N/A |
| Pending list | Status filter | Client `statusFilter` | — | UI |
| Version compare | Version 1/2 | `<select>` pair | `versions/compare.vue` | OK |

---

## Reviewer

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Enhanced review | Criteria 1–5 | 3 `<select>`s | Rating inputs (6 criteria) | OK |
| Enhanced review | Recommendation | Radio | `<select>` | OK |
| Request change | Field | — | title/abstract/description `<select>` | OK |

---

## Notifications

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Navbar | Bell dropdown | `notification-dropdown.blade.php` | `NotificationDropdown.vue` | OK |
| Preferences | Email toggles | Checkboxes | Checkboxes | OK |
| Preferences | In-app toggles | Checkboxes | Checkboxes | OK |
| Preferences | Frequency | Radio immediate/hourly/daily | `<select>` immediate/daily/weekly | OK (schema differs slightly) |
| Dashboard | Type filter | `<select>` filter | `<select>` + API `type` param | **OK** |
| Dashboard | Status filter | `<select>` filter | `<select>` + API `read` param | **OK** |
| List | All/unread/read | — | Button tabs | OK |

---

## Admin

| Screen | Control | Journal | JAPR | Status |
|--------|---------|---------|------|--------|
| Category create | Active status | Enable/Disable | Enable/Disable `<select>` | **OK** |
| Subcategory create | Parent category | Missing in Journal | Parent `<select>` + POST | **OK** |
| Sub-subcategory create | Parent subcategory | Missing in Journal | Cascading `<select>` + POST | **OK** |
| User create | Country | Hardcoded 5 or country-options | `CountrySelect` | OK |
| User create | Role | `<select>` | Checkboxes | OK |
| User edit | Role assign | — | `<select>` | OK |
| Role permissions | — | — | Checkboxes | OK |
| Audit index | User / action | `<select>` | Not ported | N/A |

---

## Shared components

| Component | Journal equivalent | API | Used by | Status |
|-----------|-------------------|-----|---------|--------|
| `CountrySelect.vue` | `country-options` / `globalRegions` | `GET /api/countries` | register, submit, settings | OK |
| `NotificationDropdown.vue` | `notification-dropdown` | `GET /api/notifications/dropdown` | editor/reviewer/admin layouts | OK |
| `JournalFiltersPanel.vue` | `journals.blade.php` sidebar | props from page | `journals/index.vue` | OK |
| `CategoryTree.vue` | welcome tree | — | **Unused** | Dead code |
| `JournalFilterBar.vue` | — | — | **Unused** | Dead code |

---

## Cascade API comparison

| Journal endpoint | JAPR equivalent |
|------------------|-----------------|
| `GET /load-subcategories?category_id=` | `GET /api/categories` (full nested tree) |
| — | `POST /api/categories/:id/subcategories` |
| — | `POST /api/subcategories/:id/sub-subcategories` |

JAPR uses a **single tree fetch** for author submit and homepage; Journal uses **lazy load** for submit subcategories only.

---

## Required fixes for “all dropdowns/selects work”

1. ~~Search: wire `subcategory`, `subsubcategory`, `license` server-side~~ **Done**
2. ~~Admin users: `CountrySelect` on create/edit~~ **Done**
3. ~~Interests: disable save when zero categories selected~~ **Done**
4. ~~Admin categories: UI for sub/sub-sub~~ **Done**

Flow parity for dropdowns/selects is **complete**. Remaining: visual UI task, optional `active_status` on category create, contact phone country.
