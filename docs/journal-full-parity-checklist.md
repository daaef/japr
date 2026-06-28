# Journal Full Parity Checklist

Source app: `C:\Users\reala\Creations\journal`  
Target app: `C:\Users\reala\Projects\japr`

Paths like `journal/resources/views/...` below are relative to the source app root above.

This checklist is intended for continuous parity verification across all user-facing systems in `journal`.

## Status legend

- `Valid` = parity confirmed
- `Invalid` = mismatch found, fix required
- `Diverges-by-design` = intentional difference, documented and accepted

## Continuous run loop

For each system, run checks in this exact order:

1. Flow (happy path + one failure path)
2. Layout (desktop/tablet/mobile structure)
3. Styling (tokens, spacing, typography, component states)

Only mark a system `Valid` when all three passes are valid. Re-run all `Invalid` items until all rows are `Valid` or `Diverges-by-design`.

---

## 1) Public shell and shared chrome

References:
- `journal/resources/views/components/layouts/layout.blade.php`
- `journal/resources/views/components/navbar.blade.php`
- `journal/resources/views/components/footer.blade.php`

### Flow checklist
- [ ] Navbar links route to expected pages
- [ ] Mobile navigation open/close and dropdown actions work
- [ ] User-specific nav state appears only when authenticated

### Layout checklist
- [ ] Header, hero region, content container, footer hierarchy match
- [ ] Desktop navbar alignment and spacing match
- [ ] Mobile menu structure and ordering match

### Styling checklist
- [ ] Typography scale/weight matches for nav/footer/hero text
- [ ] Primary/secondary button styles match
- [ ] Hover/focus/active states for nav items match

---

## 2) Public marketing and legal pages

Pages:
- `journal/resources/views/welcome.blade.php`
- `journal/resources/views/editorial.blade.php`
- `journal/resources/views/contact.blade.php`
- `journal/resources/views/privacy.blade.php`
- `journal/resources/views/terms.blade.php`

### Flow checklist
- [ ] Home category tree and search navigation flow match
- [ ] Contact form submission behavior and errors match
- [ ] Legal pages are reachable and linked consistently

### Layout checklist
- [ ] Section ordering and block composition match per page
- [ ] Content width, heading hierarchy, and spacing match
- [ ] Responsive breakpoints (375/1024/1440) preserve structure

### Styling checklist
- [ ] Hero, cards, and CTA styling match
- [ ] Form controls, labels, and validation visuals match
- [ ] Body text color, line-height, and list styles match

---

## 3) Journal discovery and public article detail

Pages/components:
- `journal/resources/views/journals.blade.php`
- `journal/resources/views/view-abstract.blade.php`
- `journal/resources/views/components/journal.blade.php`

### Flow checklist
- [ ] Search/filter/sort/pagination behavior match
- [ ] View details flow from list to article detail matches
- [ ] Like/dislike/add-remove collection behavior matches
- [ ] Preview access behavior and constraints match

### Layout checklist
- [ ] Filter panel + results grid composition match
- [ ] Journal card metadata hierarchy matches
- [ ] Detail page main column/sidebar composition matches

### Styling checklist
- [ ] Card shadows, borders, radii, spacing match
- [ ] Status/metadata badges and labels match
- [ ] Sidebar widget and action button styles match

---

## 4) Authentication and account lifecycle

Pages/layout:
- `journal/resources/views/components/layouts/auth_layout.blade.php`
- `journal/resources/views/auth/*.blade.php`

### Flow checklist
- [ ] Login success/failure behavior matches
- [ ] Register + activation code flow matches
- [ ] Forgot/reset password flow and success screens match
- [ ] OAuth redirect/callback handling matches (if enabled)
- [ ] Logout behavior and redirect target match

### Layout checklist
- [ ] Auth page split layout structure matches
- [ ] Form sequence and helper content ordering match
- [ ] Success page composition and CTA placement match

### Styling checklist
- [ ] Input, label, and validation styles match
- [ ] Auth CTA styles and disabled states match
- [ ] Error/success message visuals match

---

## 5) Review policy

Page:
- `journal/resources/views/policies/review-policy.blade.php`

### Flow checklist
- [ ] Accept/decline actions behave identically
- [ ] Submission/reviewer routes are gated consistently

### Layout checklist
- [ ] Policy sections, headings, and list structure match
- [ ] Consent controls placement matches

### Styling checklist
- [ ] Policy text styles and spacing match
- [ ] Consent checkbox/button styles match
- [ ] Error/help messaging style matches

---

## 6) Author workspace (`/dashboard` equivalent)

Pages:
- `journal/resources/views/user/dashboard.blade.php`
- `journal/resources/views/user/submit-manuscript.blade.php`
- `journal/resources/views/user/submissions.blade.php`
- `journal/resources/views/user/settings.blade.php`
- `journal/resources/views/user/manuscript-feedback.blade.php`
- `journal/resources/views/user/manuscript-versions.blade.php`

### Flow checklist
- [ ] Create/submit manuscript flow matches
- [ ] Upload revision + re-submission flow matches
- [ ] Author update for requested changes flow matches
- [ ] Feedback visibility and version history flows match
- [ ] Download journal action flow matches

### Layout checklist
- [ ] Author dashboard summary cards and sections match
- [ ] Submission list/detail structures match
- [ ] Settings form grouping and sequencing match
- [ ] Feedback/version pages structure matches

### Styling checklist
- [ ] Status badges and action buttons match
- [ ] Form and card styling match
- [ ] Modal and table/list row styling match

---

## 7) Document preview system

References:
- `journal/app/Http/Controllers/DocumentPreviewController.php`
- `journal/resources/views/components/document-reader.blade.php`

### Flow checklist
- [ ] Preview generation for supported file formats matches
- [ ] PDF serving and access controls match
- [ ] Error paths for unsupported/missing docs match

### Layout checklist
- [ ] Reader container sizing and placement match
- [ ] Loading/error placeholders match

### Styling checklist
- [ ] Reader frame/chrome visuals match
- [ ] Preview typography/rendered content frame styling matches

---

## 8) Editor workspace (`/editor`)

Layout/pages:
- `journal/resources/views/components/layouts/editor_layout.blade.php`
- `journal/resources/views/dashboard/editor/dashboard.blade.php`
- `journal/resources/views/dashboard/editor/settings.blade.php`
- `journal/resources/views/dashboard/editor/journals/*.blade.php`

### Flow checklist
- [ ] Queue flows match: pending, under-peer-review, in-progress, reviewed, approved, declined, revision-requested, ready-for-notice
- [ ] Reviewer assignment flow matches
- [ ] Approve/reject/request revisions flows match
- [ ] Send approval/decline notice flows match
- [ ] Approve-for-publication flow matches
- [ ] Version history/compare/revert flows match

### Layout checklist
- [ ] Sidebar navigation hierarchy and labels match
- [ ] Queue list/table composition matches
- [ ] Journal detail action panel composition matches

### Styling checklist
- [ ] Dashboard cards, queue rows, and badges match
- [ ] Editor form controls and action buttons match
- [ ] Alerts/notices and panel emphasis styling match

---

## 9) Regional reviewer assignment (editor sub-system)

References:
- `journal/resources/views/dashboard/editor/journals/regional-assignment.blade.php`
- `journal/app/Http/Controllers/Editor/RegionalReviewerController.php`

### Flow checklist
- [ ] Suggestion retrieval by region/interest matches
- [ ] Assignment action and confirmation behavior matches

### Layout checklist
- [ ] Suggestions list and assignment controls structure match
- [ ] Reviewer details panel structure matches

### Styling checklist
- [ ] Match score visualization and row styling match
- [ ] Assignment button and selection styles match

---

## 10) Reviewer workspace (`/reviewer`)

Layout/pages:
- `journal/resources/views/components/layouts/reviewer_layout.blade.php`
- `journal/resources/views/dashboard/reviewer/dashboard.blade.php`
- `journal/resources/views/dashboard/reviewer/settings.blade.php`
- `journal/resources/views/dashboard/reviewer/journals/*.blade.php`

### Flow checklist
- [ ] Invitation accept/decline flow matches
- [ ] Queue flows match: pending, in-progress, reviewed, approved, declined
- [ ] Enhanced review submit flow matches
- [ ] Approve/decline with comment flows match
- [ ] Request-change flow matches

### Layout checklist
- [ ] Reviewer dashboard and queue layouts match
- [ ] Enhanced review page section structure matches

### Styling checklist
- [ ] Criteria controls, form controls, and status indicators match
- [ ] Queue card/table row styling matches

---

## 11) Admin workspace (`/admin`)

Layout/pages:
- `journal/resources/views/components/layouts/admin_layout.blade.php`
- `journal/resources/views/dashboard/admin/**/*.blade.php`
- `journal/resources/views/categories/**/*.blade.php`

### Flow checklist
- [ ] Users CRUD flow matches
- [ ] Roles/permissions CRUD flow matches
- [ ] Categories/subcategories/sub-subcategories CRUD flow matches
- [ ] Admin settings update flow matches

### Layout checklist
- [ ] Admin sidebar and top navigation structure matches
- [ ] CRUD index/detail/edit layouts match

### Styling checklist
- [ ] Table/list styling and action controls match
- [ ] Admin forms, alerts, and badges match

---

## 12) Notifications (author/editor/reviewer/admin)

References:
- `journal/resources/views/notifications/*.blade.php`
- `journal/resources/views/components/notification-dropdown.blade.php`

### Flow checklist
- [ ] Dropdown, unread count, and mark-as-read flows match
- [ ] Mark-all-read and delete flows match
- [ ] Preferences and dashboard flows match
- [ ] Export and stats endpoints/UX behavior match

### Layout checklist
- [ ] Notification list and dashboard structure match
- [ ] Dropdown content hierarchy matches

### Styling checklist
- [ ] Unread/read visual distinction matches
- [ ] List density, spacing, and badge styling match

---

## 13) Version control (shared author/editor)

Views:
- `journal/resources/views/dashboard/shared/version-history.blade.php`
- `journal/resources/views/dashboard/shared/version-details.blade.php`
- `journal/resources/views/dashboard/shared/version-comparison.blade.php`

### Flow checklist
- [ ] Version history view flow matches
- [ ] Show specific version flow matches
- [ ] Compare versions flow matches
- [ ] Revert version flow matches

### Layout checklist
- [ ] Version metadata blocks and comparison structure match

### Styling checklist
- [ ] Diff/compare readability and emphasis styling match
- [ ] Version badges and metadata text styles match

---

## 14) Interests and taxonomy helpers

References:
- `journal/resources/views/interests.blade.php`
- `journal/routes/web.php` (`/interests`, `/load-subcategories`)

### Flow checklist
- [ ] Interests capture flow matches
- [ ] Dependent subcategory loading behavior matches

### Layout checklist
- [ ] Taxonomy selection structure and grouping match

### Styling checklist
- [ ] Select controls, chips/tags, and grouping styles match

---

## Scope exclusions

- Dev utility routes in `web.php`: `migrate`, `seed`, `clear`, `storage-link`, `optimize`, `key-generate`
- Debug-only blades unless explicitly requested
- Email templates as primary UI parity targets (track separately if needed)
