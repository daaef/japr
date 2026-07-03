# Plan — Operational hardening (scheduled jobs & rate limiting)

## Steps

1. **Stand up a scheduled-execution mechanism** appropriate to the deployment target — Vercel Cron calling a protected internal endpoint, since the app already deploys to Vercel. Complexity: medium; first job of its kind in this codebase.
2. **Move the upload-ownership-safety phase's blob-cleanup logic behind this scheduler** instead of a manually-triggered endpoint. Complexity: trivial once step 1 exists.
3. **Add a deadline-reminder job**: find `reviewers` rows with `status = 'in-progress'` and `reviewDeadline` within the next 48h or already passed, that haven't been reminded yet, and send a notification/email; re-check status immediately before sending to avoid reminding a reviewer who already submitted. Complexity: medium — needs a `remindedAt` column to avoid duplicate reminders.
4. **Extend rate limiting** to cover the remaining write-heavy or security-sensitive endpoints not already covered by the auth-identity-hardening and upload-ownership-safety phases (e.g. manuscript creation, reviewer decision endpoints), with generous per-user limits — this is abuse prevention, not a UX throttle, so limits should be loose enough not to affect normal use. Complexity: low per route.

## Untested paths

Actual Vercel Cron execution in production — local dev can only simulate by calling the endpoint directly.

## Regression checklist

- Manually invoking the cleanup and reminder endpoints locally produces the expected side effects (deleted orphans, sent reminders) against seeded data.
- A reviewer who submits just before a scheduled reminder run does not receive a stale "your review is overdue" reminder.
- Existing rate-limited routes (sign-in, sign-up, activation, upload-token) are unaffected by the new entries.

## Definition of Done

- [ ] App runs without new warnings or errors
- [ ] Every AC in the plan is verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete (decide and document whether the manually-triggered cleanup endpoint stays as an operator escape hatch or is removed)
- [ ] No new `any` types
- [ ] No new dependencies beyond what the chosen scheduling mechanism requires
- [ ] Cross-file consistency verified
