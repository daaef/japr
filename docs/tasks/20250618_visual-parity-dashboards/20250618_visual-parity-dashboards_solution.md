# Solution — Visual parity: dashboard stat cards & status badge

## Proposed approach
Match the reference card anatomy and badge tokens with markup-only changes (no new deps, no new endpoints).

1. `JournalStatusBadge.vue`: add `active` → `bg-success-50 text-success-600`, `suspended`/`disabled` → `bg-danger-50 text-danger-600`, and `in-review` (reference label) → info. Existing keys untouched.
2. `editor/index.vue`: convert the 4 tiles to `card > card-body` with `h4.mb-2` count + `span.text-gray-600` label + colored icon circle (`bg-main-600 ph-book-open`, `bg-purple-600 ph-graduation-cap`, `bg-success ph-check-circle`, `bg-main-two-600 ph-certificate`). Grid `col-xxl-3 col-sm-6`. Keep existing data sources and the JAPR shortcut cards.
3. `reviewer/index.vue`: add `reviewed`/`approved`/`rejected` fetches and render 5 icon cards (Pending, Reviewed, Approved, In Progress, Declined) matching reference colors/icons. Keep the "View assignments" button.
4. `admin/index.vue`: restyle the existing 3 metric tiles (Users/Roles/Categories) to the reference card anatomy with icon circles (`ph-users-three`, `ph-shield-check`, `ph-graduation-cap`). Keep existing metrics (admin journal-count endpoints are out of scope for this pass).

## Alternatives rejected
- Full reference dashboard port (greeting hero, calendar widget, charts, health panels, top-performer tables): large, needs new aggregate endpoints + a charting dep. Deferred to a later pass.
- Match admin metric set exactly (Total Journals/Approved/Pending/Total Users): needs admin-scoped journal count endpoints not present today. Deferred; documented as divergence.

## Performance impact
- Reviewer dashboard adds 3 GET requests on load (parity with reference which computes 5 counts). Neutral-to-minor; same pattern as editor dashboard. Other pages: markup-only, no runtime delta.

## Performance delta
- Reviewer index: 2 → 5 queue fetches on mount. Not separately benchmarked; equivalent to existing editor dashboard fetch count (4).

## Trade-offs
- Admin metric set still diverges from reference (documented). Decorative reference-only widgets (calendar/charts/hero) remain unported.

## Dead code audit
- None. All changes replace markup in place; no orphaned code.
