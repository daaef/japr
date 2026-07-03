# Plan — Journal search & pagination consolidation

## Steps

1. **Fix the `totalPages`/`pageCount` key mismatch** in `app/pages/journals/index.vue`, and delete the same bug from `useJournalsStore` (or delete the store entirely — confirmed unused). Complexity: trivial. AC: Next/Last controls work; clicking through pages 1→2→3 shows different results.
2. **Merge `index.get.ts` and `search.get.ts` into one query-builder** used by both routes, including the shared visibility filtering from the manuscript-visibility-unification phase, the full filter set (`category`, `subcategory`, `subsubcategory`, `country`, `language`, `license`, `searchType`), and a single `isDraft` rule. Complexity: medium. AC: both call sites produce identical filtering behavior for the same query parameters.
3. **Migrate `search_vector` to a real `tsvector` column with a GIN index**, generated from title/abstract/metaKeywords on every insert and update. Complexity: medium (needs a backfill migration). AC: search queries use `to_tsquery`/`plainto_tsquery` and hit the GIN index (verify via `EXPLAIN`).
4. **Wire the subcategory/sub-subcategory checkboxes into `JournalFiltersPanel.vue`** — the backend support already exists and is the more complete implementation, so extending the UI is recommended over removing the filters. Complexity: low.
5. **Add a `license` field to the journal create/update form and validation schema** so the existing license filter can match real data — recommended over removing a filter users can already see. Complexity: low.
6. **Add pagination to the nine unpaginated editor/reviewer queue endpoints and to `app/pages/admin/journals.vue`**, reusing the fixed `pageCount` contract from step 1. Complexity: medium (nine similar small changes). AC: each queue endpoint accepts `page`/`pageSize` and returns `meta.pageCount`; each corresponding page renders pager controls.

## Untested paths

Query-plan verification (`EXPLAIN ANALYZE`) against production-scale data — local/seed data is too small to meaningfully demonstrate the GIN index's benefit.

## Regression checklist

- Browsing public journals: filters (category/country/language/subcategory/license) all narrow results correctly and consistently between the list and search entry points.
- Pagination: Next/Last/page-number controls work on the public list, the admin journals page, and every editor/reviewer queue.
- A search term matches on title/abstract/keywords via the new `tsvector` column, including partial-word matches via `plainto_tsquery`.
- Existing bookmarked/shared URLs with query params still resolve to the same results as before.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (`useJournalsStore` removed if confirmed unused; whichever of `index.get.ts`/`search.get.ts` doesn't survive the merge is deleted, not left dormant)
- [ ] No new `any` types
- [ ] No new dependencies
- [ ] Cross-file consistency verified
