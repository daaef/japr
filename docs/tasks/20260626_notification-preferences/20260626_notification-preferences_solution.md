# Notification Preferences Solution

## Proposed Approach

Add a reusable in-app realtime preference check next to the existing email preference helpers. Keep inserting notification rows, but call `publishNotification` only when the user allows realtime in-app notifications.

## Alternatives Rejected

Suppressing notification rows entirely was rejected because the bell/history should still show notifications. Implementing hourly/daily/weekly digests was deferred because it requires scheduling and batching semantics beyond this preference-observability fix.

## Performance Impact

Slightly more work per realtime-capable notification: one user preference lookup before publishing. No extra work for bulk `createNotifications`, which does not currently publish SSE events.

## Performance Delta

No live baseline is measurable. Expected single-notification query delta is +1 user preference lookup.

## Trade-Offs

Users with realtime disabled still receive heartbeat events from an open stream; only notification payloads are suppressed.

## Dead Code Audit

No code becomes unreachable.
