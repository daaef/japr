# Desk Publication Problem

## Root Cause

The manuscript workflow skips explicit desk review and has no terminal published status, so reviewer assignment and publication are modeled with overloaded existing statuses.

## Symptoms

New submissions enter `pending` and can be assigned reviewers directly. Copy desk can view approved manuscripts but has no publication action. `publishedAt` can be set while `approvalStatus` remains `approved`, leaving public production state implicit.

## Affected Files / Functions

- `server/db/schema/journals.ts`: `approval_status` enum and default.
- `server/db/migrations`: enum/default migrations.
- `shared/constants/manuscriptStatus.ts`: status set and transitions.
- `server/api/journals/index.post.ts`: new submission status.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: assignment source guard.
- New editor endpoints for desk decision and publication.

## Blast Radius

Submission creation, editor desk queues/actions, reviewer assignment, copy-desk publication, public search/listing visibility.

## Constraints

Use migrations only. Add enum values before using them as defaults. Do not remove existing `pending` because legacy rows may still use it.

## Edge Cases

Legacy `pending` submissions should still be desk-actionable. Copy desk publication must only work from accepted states. Desk reject must be terminal and must not enter peer review.
