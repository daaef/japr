# Solution — Upload ownership binding & storage safety

## Proposed approach

Introduce the smallest possible ownership record (a `files` table) rather than embedding ownership metadata into the Blob key itself. A real table is easier to query for cleanup and easier to reason about than parsing structure out of a string key.

## Alternatives rejected

- **Encoding `ownerId`/`journalId` into the Blob pathname itself and trusting a signature** — rejected; more complex than a database row for no real benefit here, since Postgres is already in the critical path.

## Performance impact

One extra row lookup at attach-time; negligible.

## Trade-offs

The cleanup job introduces a dependency on some form of scheduled execution (see the operational-hardening phase). Until that lands, step 5 runs as a manually-triggered admin endpoint rather than blocking this phase on that infrastructure.

## Dead code audit

None.
