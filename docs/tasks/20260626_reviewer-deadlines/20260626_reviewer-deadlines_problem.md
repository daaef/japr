# Reviewer Deadlines Problem

## Root Cause

Reviewer assignments have no persisted deadline or extension workflow, so review timeliness cannot be tracked or managed.

## Symptoms

`reviewers` rows only record assignment and submission timestamps. Assignment does not set a due date, reviewers cannot request deadline extensions, and editors cannot approve extensions.

## Affected Files / Functions

- `server/db/schema/reviewers.ts`: missing deadline fields.
- `server/db/migrations`: needs reviewer deadline columns.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: should set default review deadline.
- New reviewer and editor extension endpoints.

## Blast Radius

Reviewer assignment creation/update, reviewer dashboards consuming assignment rows, editor detail views consuming reviewer rows.

## Constraints

Use migrations only. Do not add a reminder cron in this slice. Keep default deadline at 14 days from assignment.

## Edge Cases

Existing reviewer assignments may have null deadlines. Extension approval must preserve original deadline before changing it. Only assigned reviewers can request their own extension.
