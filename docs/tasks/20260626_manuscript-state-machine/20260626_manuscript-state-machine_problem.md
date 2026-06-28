# Manuscript State Machine Problem

## Root Cause

Manuscript status values and allowed transitions are encoded as scattered string literals instead of one shared workflow contract.

## Symptoms

Queue endpoints, decision endpoints, badges, and emails each reference literal statuses such as `reviewed`, `approved`, and `ready_for_managing_editor_notice`. This makes it easy for guards and queues to drift as workflow behavior changes.

## Affected Files / Functions

- `server/utils/journalWorkflow.ts`: workflow helpers and guard validation.
- `server/api/editor/journals/*.get.ts`: editor queue filters.
- `server/api/reviewer/journals/*.get.ts`: reviewer queue filters.
- `server/api/editor/journals/[uuid]/*.post.ts`: decision guards and mutations.
- `server/api/reviewer/journals/*.post.ts`: reviewer status mutations.
- `app/components/dashboard/JournalStatusBadge.vue`: local badge status map.

## Blast Radius

All manuscript lifecycle queues and decisions rely on these values. This slice changes imports and constants but does not add schema or new statuses.

## Constraints

Preserve the existing nine enum values. Do not introduce `published` or desk-review statuses until the schema-backed phase. Do not broaden this slice into UI redesign.

## Edge Cases

`reviewed` must remain available for legacy and less-than-two-review completion paths. Public visible statuses must remain explicit. Reviewer assignment statuses must not be confused with manuscript statuses.
