# Solution — Journal search & pagination consolidation

## Proposed approach

Consolidate before optimizing — merge the two divergent list endpoints into one first, then layer the `tsvector` migration and index-based search on top of a single, already-consistent query path, rather than fixing search twice in two places.

## Alternatives rejected

- **A third-party search service (Algolia/Meilisearch/Elasticsearch)** — rejected as disproportionate to the catalog size implied by the current seed data and schema; Postgres full-text search is sufficient and keeps the stack unchanged.

## Performance impact

Positive — GIN-indexed `tsvector` search replaces an 11-column sequential `ILIKE` scan; pagination on the nine queue endpoints prevents unbounded result sets as manuscript volume grows.

## Trade-offs

`tsvector` full-text search ranks and tokenizes differently than substring `ILIKE` matching (it won't match arbitrary mid-word substrings the way `%term%` does) — a deliberate trade for real scalability. This is a user-visible change in what counts as a "match" and should be called out before shipping, not discovered after.

## Dead code audit

`useJournalsStore` should be deleted outright once confirmed unused (already verified via repo-wide search in the prior audit); the duplicate filter/pagination logic in whichever of `index.get.ts`/`search.get.ts` doesn't survive the merge should be removed, not left as an unused alternate path.
