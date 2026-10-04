# Plan: Ping / nudge system

## Overview

A lightweight internal messaging system that lets editors send preset, role-aware nudges to
other users in the context of a specific manuscript. Delivered via the existing notification +
email infrastructure. No new tables required for v1 — templates are defined in code, pings are
delivered as notifications with a `ping` type, and deduplication uses a cooldown check against
recent notifications.

Depends on:
- `promote-copy-desk-collapse-desk-review` (copy desk editor must be an editor to send pings)
- `configurable-permissions` (ping ability should be permission-gated)

---

## Data model

### Ping templates — defined in code, not in the DB

A template is a function of `(targetRole, manuscriptStatus, manuscript)` that produces a
notification `title` and `message`. Storing templates in code (not a DB table) is simpler for
v1 and matches how the rest of the notification system works.

**File:** `shared/constants/pingTemplates.ts` (new)

```ts
export interface PingTemplate {
  /** Unique key, e.g. 'remind-reviewer-deadline' */
  id: string
  /** Human label shown in the ping menu */
  label: string
  /** Target role(s) this template applies to */
  targetRoles: RoleKey[]
  /** Manuscript statuses where this template is relevant (empty = any) */
  applicableStatuses: ManuscriptStatus[]
  /** Template function — receives context, returns notification title + message */
  render: (context: PingContext) => { title: string; message: string }
}

export interface PingContext {
  senderName: string
  targetName: string
  manuscriptTitle: string
  manuscriptId: string
  manuscriptStatus: ManuscriptStatus
}
```

**Example templates:**

| ID | Label | Target roles | Applicable statuses | Message |
|---|---|---|---|---|
| `new-manuscript-attention` | "New manuscript needs attention" | `managing_editor`, `editor_in_chief` | `in_progress` | "{senderName} flagged '{manuscriptTitle}' for your attention — reviewers need to be assigned." |
| `remind-reviewer-deadline` | "Review deadline reminder" | `associate_editor`, `external_reviewer`, `desk_editor` | `under_peer_review`, `in_progress` | "{senderName} reminded you about your pending review for '{manuscriptTitle}'." |
| `revision-overdue` | "Revision overdue" | `author` | `changes_requested` | "{senderName} is following up on the revision request for '{manuscriptTitle}'." |
| `final-decision-needed` | "Final decision needed" | `editor_in_chief`, `admin` | `ready_for_managing_editor_notice`, `reviewed` | "{senderName} flagged '{manuscriptTitle}' — all reviews are in and a final decision is needed." |
| `general-attention` | "Needs your attention" | all roles | any | "{senderName} pinged you about '{manuscriptTitle}'." |
| `escalate-to-admin` | "Escalate to admin" | `admin` | any | "{senderName} escalated '{manuscriptTitle}' — admin intervention requested." |

Templates are intentionally short and professional. The sender does not write free-text (v1) —
they pick a template. Free-text pings can be added in v2 if needed.

### No new DB tables for v1

Pings are stored as regular notification rows with `type: 'ping'` and the template ID in
`data.pingTemplateId`. This means:
- They show up in the notification dropdown and list page automatically.
- They're subject to existing read/delete/export flows.
- No schema migration required.

The `data` blob for a ping notification:

```ts
{
  title: "Review deadline reminder",
  message: "Jane Editor reminded you about your pending review for 'Quantum Effects in...'.",
  action_url: "/editor/journals/{journalId}",  // or /reviewer/journals/{journalId}/review
  journalId: "uuid",
  journalTitle: "Quantum Effects in...",
  pingTemplateId: "remind-reviewer-deadline",
  senderId: "uuid",
  senderName: "Jane Editor",
  icon: "lucide:bell-ring",
  color: "warning",
  priority: "high"
}
```

### Deduplication — cooldown, not a separate table

Before sending a ping, check: "Has a notification with `type: 'ping'` and the same
`data.pingTemplateId` + `data.journalId` been sent to this user in the last N hours?"

```sql
SELECT 1 FROM notifications
WHERE user_id = $1
  AND type = 'ping'
  AND data->>'pingTemplateId' = $2
  AND data->>'journalId' = $3
  AND created_at > NOW() - INTERVAL '4 hours'
LIMIT 1
```

If a row exists, reject with 429 ("Already pinged recently — try again later"). The 4-hour
cooldown prevents spam while allowing daily follow-ups.

**Index:** Add a partial index for performance:
```sql
CREATE INDEX notifications_ping_cooldown_idx
ON notifications (user_id, created_at)
WHERE type = 'ping';
```

---

## Permission model

### New permission

```ts
{ name: 'send-ping', resource: 'ping', action: 'send', scope: 'any',
  description: 'Send preset nudge messages to other users.' }
```

Granted to: `editor_in_chief`, `managing_editor`, `copy_desk_editor`, `admin` (via seeds).
NOT granted to: `associate_editor`, `external_reviewer`, `desk_editor`, `author` by default
(but the admin can grant it via the permissions UI from the configurable-permissions task).

### Who can ping whom — no restrictions in v1

Any user with `ping:send` can ping any user on the platform, as long as the template's
`targetRoles` includes at least one of the target user's roles. This is simple and covers
the main use cases. Fine-grained "editor X can only ping reviewers assigned to their
manuscripts" can be added in v2 if needed.

---

## API

### `POST /api/editor/journals/[uuid]/ping`

**Guard:** `requirePermission(event, 'ping', 'send')`

**Body:**
```ts
{
  templateId: string       // e.g. 'remind-reviewer-deadline'
  targetUserId: string     // specific user to ping
}
```

**Flow:**
1. Validate `templateId` exists in the template registry.
2. Load the target user — verify they exist and hold at least one of the template's
   `targetRoles`.
3. Load the journal — verify it exists and its status matches `applicableStatuses` (if the
   template restricts by status).
4. Cooldown check — query for recent duplicate ping (see above). 429 if duplicate.
5. Render the template with context.
6. `createNotification({ userId: targetUserId, type: 'ping', data: { ... } })`.
7. `sendIfEmailAllowed(targetUserId, 'manuscript_status', () => sendPingEmail(...))`.
8. Return `{ ok: true }`.

### `GET /api/editor/journals/[uuid]/ping-templates`

**Guard:** `requirePermission(event, 'ping', 'send')`

Returns the list of templates applicable to this manuscript's current status, with the target
users who could receive each one. This powers the UI dropdown.

**Response:**
```ts
{
  templates: Array<{
    id: string
    label: string
    targets: Array<{
      userId: string
      fullname: string
      role: string
    }>
  }>
}
```

The endpoint:
1. Loads the journal to get its current status.
2. Filters templates by `applicableStatuses`.
3. For each remaining template, queries users who hold at least one of `targetRoles`.
4. For reviewer-targeted templates, optionally narrows to reviewers assigned to THIS manuscript
   (better UX — you ping the actual reviewer, not every reviewer on the platform).

---

## Email

### New email sender

**File:** `server/utils/email.ts` — add `sendPingEmail`:

```ts
export async function sendPingEmail(
  to: string,
  recipientName: string,
  senderName: string,
  manuscriptTitle: string,
  message: string,
  actionUrl: string
) {
  return sendEmail({
    to,
    subject: `${senderName} pinged you about: ${manuscriptTitle}`,
    html: buildJournalEmail(`
      <p>Hello ${escapeHtml(recipientName)},</p>
      <p>${escapeHtml(message)}</p>
      <p><a href="${process.env.NUXT_PUBLIC_SITE_URL || ''}${escapeHtml(actionUrl)}">
        View manuscript
      </a></p>
    `)
  })
}
```

### Notification preference category

Add a new email preference category `ping` to `shared/validation/notifications.ts`:

```ts
email: {
  manuscript_status: z.boolean().default(true),
  review_assignment: z.boolean().default(true),
  new_submissions: z.boolean().default(true),
  ping: z.boolean().default(true)           // <-- new
}
```

This lets users opt out of ping emails without losing other notifications. Migration needed to
add the default to existing `notificationPreferences` jsonb values (or handle missing key as
`true` in `userAllowsEmail` — which it already does via defaulting).

---

## UI

### Ping button on the editor manuscript detail page

**File:** `app/pages/editor/journals/[uuid].vue`

Add a "Ping" dropdown button in the editorial actions card. The dropdown lists available
templates (from `GET /api/editor/journals/[uuid]/ping-templates`), each expanding to show
target users.

```
[Ping v]
  |-- New manuscript needs attention
  |     |-- Jane Smith (Managing Editor)
  |     |-- Bob Jones (EIC)
  |-- Remind reviewer about deadline
  |     |-- Alice Reviewer
  |     |-- Charlie Reviewer
  |-- Revision overdue
  |     |-- David Author
```

Clicking a target fires `POST /api/editor/journals/[uuid]/ping` and shows a success toast.
If cooldown is hit (429), show "Already pinged recently — try again in a few hours."

**Implementation:** A new `<PingMenu>` component:

```vue
<PingMenu
  :journal-id="uuid"
  :journal-status="detailData.journal.approvalStatus"
/>
```

The component:
1. Fetches templates on mount (or on dropdown open).
2. Renders a nested `UDropdownMenu` with template groups and target users.
3. On click, POSTs the ping and shows feedback.
4. Gated by `can('ping', 'send')` — hidden if the user lacks the permission.

### Ping indicator in notification list

Ping notifications already render via the generic notification list. Optionally add an icon
override: when `notification.type === 'ping'`, show a bell-ring icon instead of the default.

No other UI changes needed — the notification dropdown, list page, and SSE realtime push
all handle `type: 'ping'` automatically.

---

## File change summary

| Action | File |
|--------|------|
| **New** | `shared/constants/pingTemplates.ts` — template definitions |
| **New** | `server/api/editor/journals/[uuid]/ping.post.ts` — send ping endpoint |
| **New** | `server/api/editor/journals/[uuid]/ping-templates.get.ts` — list templates endpoint |
| **New** | `app/components/editor/PingMenu.vue` — UI component |
| Edit | `server/utils/email.ts` — add `sendPingEmail` |
| Edit | `shared/validation/notifications.ts` — add `ping` email category |
| Edit | `shared/constants/permissions.ts` — add `send-ping` permission |
| Edit | `server/db/seeds/system.ts` — grant `send-ping` to editor roles |
| Edit | `app/pages/editor/journals/[uuid].vue` — add `<PingMenu>` |
| **New** | `server/db/migrations/0019_ping_cooldown_index.sql` — partial index |
| Edit | `app/components/dashboard/NotificationDropdown.vue` — optional icon override |

---

## Open questions for the developer

1. **Free-text pings in v1?** The plan uses preset templates only. If you want editors to type
   a custom message, that adds a `customMessage` field to the API and a text input in the UI.
   More flexibility, more abuse potential. Recommend starting with presets and adding free-text
   later if needed.

2. **Ping targets: specific user or entire role?** The plan targets a specific user. If you
   want "ping all managing editors," that's a bulk send (already supported by
   `createNotifications`). The UI would need a "ping all" option per template.

3. **Cooldown duration:** 4 hours proposed. Too long? Too short?

4. **Should authors be able to ping editors?** The plan only grants `ping:send` to editor roles.
   An author who wants to follow up on their submission currently has no way to nudge an editor.
   This could be a separate "author inquiry" feature or the same ping system with author-
   specific templates.

5. **Audit trail:** Should pings be logged in the admin audit log (`logAdminAction`)? Recommend
   yes — it's one line of code and provides accountability.

---

## Risks

1. **Spam.** Mitigated by cooldown (4-hour dedup) and permission gating. If abuse occurs, the
   admin can revoke `ping:send` from the offending role.
2. **Email overload.** Mitigated by the `ping` email preference category — users can opt out.
3. **Template staleness.** Templates are defined in code, so adding a new one requires a deploy.
   Acceptable for v1; a DB-backed template editor is a v2 feature if needed.
4. **Performance of the cooldown query.** The partial index on `notifications(user_id,
   created_at) WHERE type = 'ping'` keeps this fast. The table is already indexed on `user_id`.
