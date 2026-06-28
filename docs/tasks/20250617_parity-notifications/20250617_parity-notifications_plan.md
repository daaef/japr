# Plan — notification stats + email preference enforcement

| Step | Task | Complexity | AC |
|------|------|------------|-----|
| 1 | `server/utils/notificationPreferences.ts` | low | `userAllowsEmail` + `sendIfEmailAllowed` exported |
| 2 | `server/api/notifications/stats.get.ts` | low | Returns total/unread/today/thisWeek/highPriority |
| 3 | Stat cards on `app/pages/notifications/index.vue` | low | Four cards visible; refresh on mark read/delete |
| 4 | Gate email call sites | medium | Prefs off → no email; in-app notification still created |
| 5 | Fix editor submit notification email | trivial | Uses `sendManuscriptSubmissionEmail` + `new_submissions` |

## Untested paths
No automated tests for stats API or preference gating.

## Regression checklist
- `POST /api/journals` author + editor emails
- Editor approve/reject/request-revisions/send-notice routes
- `assign-reviewers.post.ts`
- `editorNotifications.ts` helpers
- Reviewer decline/request-change routes
- `/notifications` page load

## Definition of Done
- [x] App runs without new warnings or errors
- [x] Every AC verified (typecheck green)
- [ ] Regression checklist — manual
- [x] Dead code audit — sendManuscriptSubmissionEmail now used
- [x] No new any types
- [x] No new dependencies
- [x] Cross-file consistency — all editorial emails gated via helper
