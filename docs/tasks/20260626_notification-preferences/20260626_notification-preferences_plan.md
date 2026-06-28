# Notification Preferences Plan

## Ordered Steps

1. Add tests for a pure realtime preference helper. Complexity: low. Acceptance: tests fail until helper exists.
2. Add `preferencesAllowRealtime` and `userAllowsRealtimeNotifications` in `server/utils/notificationPreferences.ts`. Complexity: low. Acceptance: missing prefs default to true and explicit false suppresses realtime.
3. Update `createNotification` in `server/utils/notifications.ts`. Complexity: low. Acceptance: rows are inserted but SSE publish is gated.
4. Verify with tests, typecheck, and touched-file lints. Complexity: low. Acceptance: checks pass.

## Untested Path Disclosure

No SSE integration test exists. The pure preference behavior is tested; the DB-backed branch is verified by typecheck.

## Regression Checklist

- `createNotification` still returns inserted rows.
- `createNotifications` bulk insert behavior remains unchanged.
- Email preference behavior remains unchanged.
- Missing notification preferences still default to realtime enabled.

## Definition Of Done

- [ ] App runs without new warnings or errors
- [ ] Every acceptance criterion is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new `any` types or unsafe assertions without inline justification
- [ ] No new dependencies
- [ ] Cross-file consistency verified
- [ ] Performance baseline recorded and delta noted
