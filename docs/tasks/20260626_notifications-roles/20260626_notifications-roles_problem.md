# Notifications And Roles Problem

## Root Cause

Editorial mutations use broad role guards and some status transitions do not notify authors through a consistent author-safe path.

## Symptoms

`requireEditor` allows `editor_in_chief` and `managing_editor` to perform the same mutating actions. Reviewer assignment, review status sync, and intermediate status changes can update `approvalStatus` without a neutral author-facing status notification.

## Affected Files / Functions

- `shared/constants/permissions.ts`: role permission definitions.
- `server/utils/permissions.ts`: permission enforcement helper already exists.
- `server/api/editor/journals/[uuid]/*.post.ts`: editor mutations use broad guards.
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`: assignment changes manuscript status.
- `server/utils/journalWorkflow.ts`: review-stage sync changes manuscript status.

## Blast Radius

Editor decision endpoints, future seed role permissions, author notification volume, and workflow status changes.

## Constraints

Do not add schema. Preserve `admin` superuser behavior. Do not leak reviewer identities in author notifications. Email sends must use notification preferences.

## Edge Cases

Authors should not get reviewer names or ratings in status updates. Managing editors should not be able to final-approve or publish. Editor-in-chief should retain final decision authority.
