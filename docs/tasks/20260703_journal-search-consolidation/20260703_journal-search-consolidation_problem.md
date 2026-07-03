# Problem — Journal listing/search/pagination is implemented three times, inconsistently

## Root cause

Journal listing/search/pagination is implemented independently in at least three places that have each drifted: `index.get.ts` and `search.get.ts` support different filter sets and different column-exclusion rules (see the manuscript-visibility-unification phase); the client (`app/pages/journals/index.vue`) reads a `meta.totalPages` field the server never sends (the server sends `pageCount`, per `server/utils/pagination.ts`), so `undefined ?? 1` permanently disables the Next/Last pagination controls; a third implementation, the Pinia `useJournalsStore`, duplicates the same bug and is never actually imported anywhere.

Underneath, `search_vector` (`server/db/schema/journals.ts:84`) is plain concatenated text matched with a leading-wildcard `ILIKE`, not a real `tsvector`, with no supporting GIN/trigram index in any migration. The subcategory/sub-subcategory filters are fully implemented server-side but have no corresponding UI in `JournalFiltersPanel.vue`, and the license filter can never match a real submitted journal because no create/update form field ever writes a `license` value.

## Symptoms

- Nobody can browse past page 1 of the public journal list through the UI.
- Search performs a sequential scan across up to 11 columns per query.
- The subcategory/sub-subcategory and license filters are effectively dead from a user's perspective.
- Nine editor/reviewer queue endpoints return unbounded result sets with no pagination at all.

## Affected files / functions

- `app/pages/journals/index.vue`, `app/stores/journals.ts`
- `server/utils/pagination.ts`
- `server/api/journals/index.get.ts`, `server/api/journals/search.get.ts`
- `server/db/schema/journals.ts`, `server/db/migrations/`
- `app/components/JournalFiltersPanel.vue`, `shared/validation/journals.ts`
- `server/api/editor/journals/*.get.ts` (nine unpaginated queue endpoints)
- `app/pages/admin/journals.vue`

## Blast radius

The public journal browse/search experience, and every editor/reviewer manuscript queue view.

## Constraints

Depends on the manuscript-visibility-unification phase landing first, so the unified query-builder can call its shared visibility function for column filtering instead of re-implementing exclusion logic a third time.

## Edge cases

Switching `search_vector` to a real `tsvector` needs a backfill migration for existing rows, and the write path (`index.post.ts`, `[id].patch.ts`) needs to regenerate it on every write, not just at creation.
