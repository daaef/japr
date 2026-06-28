# Audit Log Deferral Problem

## Root Cause

The accepted implementation plan marked admin audit logging as scope-gated and dependent on later approval.

## Symptoms

JAPR still has no admin audit log table or UI. This is a compliance/demo visibility gap, not a blocker for the critical editorial workflow fixes already implemented.

## Affected Files / Functions

- No runtime files are changed in this deferred slice.
- Future implementation would affect `server/db`, `server/utils`, `server/api/admin/audit`, and `app/pages/admin/audit.vue`.

## Blast Radius

Future audit logging would touch sensitive admin/editorial mutation paths.

## Constraints

Do not add an audit subsystem without explicit active-scope approval because it adds schema, write paths, read APIs, filtering/export UX, and operational policy choices.

## Edge Cases

Future audit logging must decide whether audit-write failure blocks the original mutation or is best-effort.
