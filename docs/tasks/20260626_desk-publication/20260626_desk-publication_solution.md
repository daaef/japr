# Desk Publication Solution

## Proposed Approach

Add `desk_review` and `published` to the Postgres enum through migrations, then update schema/constants. New submissions enter `desk_review`. Editors can desk-reject or send to review. Reviewer assignment is allowed only after send-to-review. Copy desk can mark accepted manuscripts as `published`.

## Alternatives Rejected

Reusing `pending` for desk review was rejected because the selected model explicitly adds desk triage. Treating `approved + publishedAt` as published was rejected because the Copy Desk role needs an observable terminal action.

## Performance Impact

Neutral for reads and writes. New actions are low-frequency status updates. Public searches may include one extra visible status.

## Performance Delta

No live DB is available for timing. Query counts are unchanged except new endpoints perform one journal update and notification/email work.

## Trade-Offs

Existing rows with `pending` remain valid and must be tolerated by desk actions. Existing databases need migrations before code using `desk_review` or `published` runs.

## Dead Code Audit

No code becomes unreachable. `approve-for-publication` remains an acceptance-to-production precursor until full copy-desk UI flow is expanded.
