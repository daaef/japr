# Notification Preferences Changelog

## Layer 1 - High-Level

The stored `in_app.realtime` preference now has observable behavior. Notification rows are still created for history and bell views, but realtime SSE notification payloads are only published when the user allows realtime in-app notifications.

## Layer 2 - Low-Level

- `tests/notificationPreferences.test.ts`: added coverage for missing preferences defaulting to realtime enabled and explicit realtime false suppressing delivery.
- `server/utils/notificationPreferences.ts`: added `preferencesAllowRealtime` and `userAllowsRealtimeNotifications` next to the existing email preference helpers.
- `server/utils/notifications.ts`: gates `publishNotification` behind `userAllowsRealtimeNotifications` while keeping database insertion unchanged.

## Verification

- `pnpm test -- tests/notificationPreferences.test.ts`: passed, 17 tests.
- `pnpm test`: passed, 17 tests.
- `pnpm typecheck`: passed.
- `ReadLints` on touched files: no linter errors.
- `pnpm db:check`: still blocked by local Postgres connection refusal; no schema was touched.

## Deferred

`frequency` and `weekly_summary` remain scope-gated for a future digest worker or UI removal decision.
