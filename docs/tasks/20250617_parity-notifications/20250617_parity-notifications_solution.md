# Solution — notification stats + email preference enforcement

## Proposed approach
1. Add `GET /api/notifications/stats` returning total, unread, today, thisWeek, highPriority (parity with Laravel `getRealTimeStats`).
2. Add stat cards to `/notifications` and refresh stats on list mutations.
3. Add `sendIfEmailAllowed(userId, category, send)` helper reading `users.notification_preferences`.
4. Wrap editorial email call sites with category mapping:
   - `manuscript_status` — decisions, revisions, review workflow
   - `review_assignment` — reviewer invitations
   - `new_submissions` — editor alert on author submit
5. Fix editor new-submission email to use `sendManuscriptSubmissionEmail`.

## Alternatives rejected
- **Gating inside `sendEmail()`** — would require passing category on every call including auth mail; too invasive.
- **Separate stats page** — Laravel embeds stats on dashboard; extending existing index is smaller surface.

## Performance impact
Neutral — one extra COUNT query batch on stats page load; one user prefs lookup per gated email (same as Laravel `via()` check).

## Performance delta
Not measured — prefs lookup is single-row by PK; stats are 5 indexed counts.

## Trade-offs
- `frequency` preference not enforced (immediate-only sends).
- `weekly_summary` category has no sender yet.

## Dead code audit
None — `sendManuscriptSubmissionEmail` now used; was previously dead.
