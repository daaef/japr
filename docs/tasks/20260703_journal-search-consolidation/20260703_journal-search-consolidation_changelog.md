# Changelog — Journal search & pagination consolidation

## Layer 1 — High-level

Public journal browsing was permanently stuck on page 1 — the frontend read `meta.totalPages`, a field the server never sent (`pageCount`). Fixed, and a confirmed-dead Pinia store with the same bug deleted outright. The two independently-drifted list/search endpoints now share one query-builder, so filters behave identically regardless of which URL a page calls. Full-text search now uses a real Postgres `tsvector` column with a GIN index instead of an unindexed 11-column `ILIKE` scan — **this changes what counts as a "match": it's now word/stem-based, not substring-based** (see trade-off note below, flagged per the task's own solution doc). The subcategory/sub-subcategory filters (already fully implemented server-side) are now reachable from the UI. A license field now exists on the submission form so the pre-existing license filter can match real data. Nine unbounded editor manuscript-queue endpoints, plus the admin journals page, are now paginated.

## Layer 2 — Low-level

- **`app/pages/journals/index.vue`** — `meta.totalPages` → `meta.pageCount` (both the type and the computed usage); this was the actual pagination bug.
- **`app/stores/journals.ts`** — deleted (confirmed zero imports anywhere in `app/`; had the identical `totalPages` bug).
- **`server/utils/journalQuery.ts`** (new) — `buildPublicJournalConditions`/`listPublicJournals`, the single query-builder now used by both `server/api/journals/index.get.ts` and `server/api/journals/search.get.ts` (both now thin wrappers). Includes the full filter set (search/searchType, category, subcategory, subsubcategory, country, journalLanguage, license, approvalStatus override) and routes results through phase 2's `projectJournalForViewer(row, 'public')`.
- **`server/db/schema/journals.ts`** — `searchVector` is now a Postgres **generated** `tsvector` column (`customType` + `.generatedAlwaysAs(...)`, `GENERATED ALWAYS AS (...) STORED`) computed from `title`/`abstract`/`metaKeywords`, with a GIN index. Removed the manual `searchVector` writes from `journals/index.post.ts` and `[id].patch.ts` — a generated column rejects explicit values, and Postgres now keeps it in sync automatically on every insert/update, which is a stronger guarantee than the plan's "regenerate on every write path" (no write path can forget). Migration `0011_spooky_masque.sql` — Postgres backfilled the tsvector for all existing rows automatically as part of adding the generated column, so no separate manual backfill script was needed (the plan anticipated needing one).
- **`server/utils/journalQuery.ts`** search matching — `searchType: 'title'` still does `ILIKE` on title only; the default/keyword search now matches `searchVector @@ plainto_tsquery('english', ...)`, an indexed lookup, and is scoped to title/abstract/metaKeywords only (previously matched 11 columns including country/language/description/institution, which are already covered by their own dedicated filters).
- **`app/components/JournalFiltersPanel.vue`**, **`app/pages/journals/index.vue`** — added nested subcategory/sub-subcategory checkboxes (progressively disclosed: a category's subcategories show once it's checked, and so on), matching the existing accordion pattern.
- **`shared/constants/journalLicenses.ts`** (new) — `JOURNAL_LICENSE_OPTIONS`, extracted from what was an inline list in `JournalFiltersPanel.vue` so the create form doesn't duplicate it a second time.
- **`shared/validation/journals.ts`** — added `license` to `journalCreateSchema`. **`server/api/journals/index.post.ts`**, **`server/api/journals/[id].patch.ts`** — write/update `license`. **`app/pages/author/submit.vue`** — added a license `<select>` populated from the shared options list.
- **`server/utils/journalQueue.ts`** (new) — `listJournalsByStatus(pagination, statuses, orderColumn?)`, shared by all nine previously-unpaginated `server/api/editor/journals/*.get.ts` endpoints (`pending`, `approved`, `in-progress`, `published`, `ready-for-notice`, `rejected`, `reviewed`, `revision-requested`, `under-peer-review`), each now validating `page`/`pageSize` via the already-existing (but previously unused) `shared/validation/common.ts` `paginationSchema`.
- **`app/components/dashboard/JournalQueueList.vue`** — wired to the already-existing but previously *never-used* `AppPagination.vue` component. Since all nine editor queue pages (`app/pages/editor/*.vue`) delegate to this one shared component, this single change adds working pager controls to all nine without touching each page individually.
- **`app/pages/admin/journals.vue`** — added the same `AppPagination` wiring directly (doesn't use `JournalQueueList`).

## Trade-off surfaced (per the task's own solution doc: "should be called out before shipping, not discovered after")

Switching from leading-wildcard `ILIKE '%term%'` to `plainto_tsquery('english', term)` changes what counts as a search match:
- **Still matches:** whole words and their stems (e.g. "climate" matches "climate", "climates", "climatic" via English stemming).
- **No longer matches:** arbitrary mid-word substrings (e.g. "clim" no longer matches "climate" — verified live, returns 0 results where the old `ILIKE` would have returned matches).
- **Narrower field coverage:** general search now only considers title/abstract/metaKeywords (previously also matched country/journalLanguage/description/institution/metaTitle/metaDescription in the same giant `OR`) — those are already covered by their own dedicated filters (country, language), so this narrowing removes accidental cross-field matches rather than real search capability.

This is the trade-off the solution doc explicitly endorsed for real scalability (GIN-indexed lookup vs. an unindexed sequential scan across up to 11 columns) — flagging it here rather than letting it be discovered as a surprise after this ships.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (35/35) — all pass.
- `pnpm db:migrate` — the tsvector migration's first `db:generate` output included a broken statement (`ALTER COLUMN "search_vector" SET DATA TYPE "undefined"."tsvector"` — a literal invalid schema-qualifier drizzle-kit generated for a custom type it doesn't fully understand for `ALTER COLUMN`). The very next statement in the same file drops and recreates the column anyway, so the broken statement was redundant; removed it by hand and reapplied — verified no partial state was left behind by the first failed attempt (checked the live column type and drizzle's migration-tracking table before retrying).
- Live against `nuxt dev` + the docker-compose Postgres:
  - `pageSize=3` pagination: `meta.pageCount` correct, page 1 vs page 2 return different rows.
  - Full-text search: "health" and "agriculture" match via stemmed word search; "clim" (fragment of "climate") returns 0 — confirms the documented trade-off; `searchType=title` still narrows to title-only.
  - Subcategory filter narrows to exactly the 2 seeded journals under that subcategory.
  - License filter matches the 8 seeded journals sharing a `{type: "CC BY 4.0", ...}` seed value via substring match on the cast-to-text jsonb column (existing mechanism, unchanged) — confirmed real seed data has a different (object) shape than what the new form now writes (plain string label); see "Non-obvious note" below.
  - Submitted a real manuscript via the API with `license: "CC BY-SA"` — persisted correctly and matched the filter (once flipped to a public status — a freshly-submitted manuscript starts in `desk_review`, which phase 2's visibility gate correctly excludes from public search; this was confirmed to be correct gating, not a bug, after initially expecting the wrong result).
  - Editor `approved` queue: `pageSize=2` → `meta.pageCount: 5` for the 9 seeded (public-status) journals, 2 returned.
  - All test data created during verification was deleted afterward.

## Non-obvious note

The seed script (`server/db/seeds/testJournals.ts`) writes `license` as a structured `{ type, url }` object for its 8 sample journals, but nothing in the app actually reads/displays that shape anywhere — it's decorative seed data, not an established contract. The new create-form field intentionally writes a plain string label instead of fabricating a matching `{type, url}` shape, specifically to avoid inventing unverified real-world license URLs (e.g. a guessed canonical link for "CC BY-NC-ND" or "Public domain") that could be legally meaningful if wrong. Both shapes coexist in the `license` jsonb column; the filter's cast-to-text substring match works against either.

## Untested paths

Per the plan: `EXPLAIN ANALYZE` query-plan verification against production-scale data — this dev/seed dataset (9 journals) is too small to meaningfully demonstrate the GIN index's benefit over a sequential scan.
