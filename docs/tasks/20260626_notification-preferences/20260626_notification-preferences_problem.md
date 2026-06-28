# Notification Preferences Problem

## Root Cause

In-app realtime notification preferences are stored but never read by the SSE publishing path.

## Symptoms

`createNotification` always publishes to active SSE listeners after inserting a notification row. A user who disables `in_app.realtime` still receives realtime pushes.

## Affected Files / Functions

- `server/utils/notifications.ts`: publishes every single notification.
- `server/utils/notificationPreferences.ts`: reads email preferences only.
- `shared/validation/notifications.ts`: defines `in_app.realtime`.

## Blast Radius

In-app realtime notification delivery. Notification rows and notification history should remain unchanged.

## Constraints

Do not suppress database notification rows. Do not implement digest scheduling in this slice. Preserve current default realtime behavior.

## Edge Cases

Missing preferences should default to realtime enabled. Only `in_app.realtime === false` should suppress SSE publication.
