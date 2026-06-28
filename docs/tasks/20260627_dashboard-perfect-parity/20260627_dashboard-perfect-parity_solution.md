# Solution — Dashboard Perfect Parity

## Proposed Approach
Implement dashboard parity as a set of focused Nuxt/Drizzle slices: first make all workflow queues visible and countable, then add server-side aggregate endpoints, then restore role-specific landing-page UI, and finally add the deferred admin audit dashboard. Use shared dashboard components for stat cards, queue summaries, and empty/error states so each role stays consistent without recreating Laravel Blade patterns verbatim.

## Alternatives Rejected
- Recreate the Laravel Blade pages exactly: rejected because Japr is Nuxt/Vue and already has reusable components, composables, role middleware, and API-backed workflows.
- Leave admin analytics as hardcoded/client-counted UI: rejected because the original dashboard is operational, and loading full lists just to count records is both slower and less accurate.
- Replicate reviewer placeholder metrics with `rand()`: rejected because “perfect parity” should preserve the feature purpose, not fake values.

## Performance Impact
Positive. Dashboard cards should move from multiple full-list fetches to count/summary endpoints. Admin analytics add aggregate queries, but they are bounded and cheaper than sending full records.

## Performance Delta
Current editor/reviewer index pages issue 4–5 full-list requests for counts. Target state: one role summary request per dashboard plus optional list endpoints only for tables. Exact timings require measurement during implementation.

## Trade-offs
This is a broader change than visual parity: it adds API contracts, audit persistence, and dashboard analytics. The plan intentionally keeps charting simple to avoid a dependency unless an existing project asset can satisfy the UI.

## Dead Code Audit
Potential removals after implementation: unused hardcoded homepage stats, duplicate count fetches on role indexes, reviewer `/reviews` redirect stub if replaced with a real assignment dashboard, and any superseded queue-only shortcut markup.
