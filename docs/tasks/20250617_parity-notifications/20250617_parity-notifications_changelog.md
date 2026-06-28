# Changelog — parity-notifications

## Layer 1
The notifications page now shows summary statistics (total, unread, today, this week) matching Laravel's notification dashboard. Editorial emails respect per-user notification preferences stored in the database — turning off manuscript status, review assignment, or new submission emails in preferences stops those messages while in-app notifications continue. Editor alerts on new author submissions now use the correct manuscript-submission email template.

## Layer 2

| File | Change |
|------|--------|
| `server/utils/notificationPreferences.ts` | New — `userAllowsEmail`, `sendIfEmailAllowed` |
| `server/api/notifications/stats.get.ts` | New — aggregated notification counts |
| `app/pages/notifications/index.vue` | Stat cards + `refreshAll()` on mutations |
| `server/api/journals/index.post.ts` | Gated author/editor emails; fixed editor email function |
| `server/api/editor/journals/[uuid]/*.post.ts` | Gated `sendDecisionEmail` via `manuscript_status` |
| `server/api/editor/journals/[uuid]/assign-reviewers.post.ts` | Gated via `review_assignment` |
| `server/utils/editorNotifications.ts` | Gated editor workflow emails via `manuscript_status` |
| `server/api/reviewer/journals/*.post.ts` | Gated author-facing emails |
| `server/api/author/submissions/[id]/author-update.post.ts` | Gated change-resolved email |
