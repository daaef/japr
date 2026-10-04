# Changelog: Ping / nudge system

## Summary

Editors can now send preset, role-aware nudge messages to other users in the context of a
specific manuscript. Pings are delivered via the existing notification + email infrastructure
with no new DB tables.

## New files

| File | Purpose |
|------|---------|
| `shared/constants/pingTemplates.ts` | 6 preset templates with role/status targeting and render functions |
| `server/api/editor/journals/[uuid]/ping.post.ts` | Send a ping (permission-gated, cooldown-deduped) |
| `server/api/editor/journals/[uuid]/ping-templates.get.ts` | List applicable templates + target users for a manuscript |
| `app/components/editor/PingMenu.vue` | Popover UI: pick template, pick target, send |
| `server/db/migrations/0019_ping_cooldown_index.sql` | Partial index for cooldown queries |

## Edited files

| File | Change |
|------|--------|
| `shared/constants/permissions.ts` | Added `send-ping` permission; granted to EIC, ME, copy desk, admin |
| `shared/validation/notifications.ts` | Added `ping` email preference category (default: true) |
| `server/utils/email.ts` | Added `sendPingEmail` function |
| `app/pages/editor/journals/[uuid].vue` | Added `<EditorPingMenu>` next to the status badge |
| `app/components/dashboard/NotificationDropdown.vue` | Bell-ring icon override for `type: 'ping'` |
| `app/pages/notifications/preferences.vue` | Added "Ping / nudge messages" toggle |
| `server/db/migrations/meta/_journal.json` | Added entry for migration 0019 |

## Templates

| ID | Label | Target roles | Applicable statuses |
|----|-------|-------------|---------------------|
| `new-manuscript-attention` | New manuscript needs attention | ME, EIC | `in_progress` |
| `remind-reviewer-deadline` | Review deadline reminder | AE, ER, DE | `under_peer_review`, `in_progress` |
| `revision-overdue` | Revision overdue | Author | `changes_requested` |
| `final-decision-needed` | Final decision needed | EIC, Admin | `ready_for_managing_editor_notice`, `reviewed` |
| `general-attention` | Needs your attention | All roles | Any |
| `escalate-to-admin` | Escalate to admin | Admin | Any |

## Key design decisions

- **No new DB tables** — pings are notifications with `type: 'ping'` and template metadata in `data`.
- **Cooldown dedup** — same template + journal + target within 4 hours = 429 rejection.
- **Reviewer narrowing** — for reviewer-targeted templates, the templates endpoint only shows
  reviewers assigned to the specific manuscript, not every reviewer on the platform.
- **Preset only** — no free-text messages in v1 to prevent abuse.
- **Email opt-out** — users can disable ping emails via the new `ping` preference without
  losing other notifications.
- **Audit trail** — every ping is logged via `logAdminAction`.

## Tests

- `tests/permissions.test.ts` — send-ping granted to editor roles, not reviewer/author; ping
  template uniqueness and role validity; `getPingTemplate` lookup; template render output.
- `tests/notificationPreferences.test.ts` — default preferences include `ping: true`.
