# Problem — No scheduled execution mechanism exists for time-based work

## Root cause

The app has no scheduled/background execution mechanism at all. Reviewer deadlines are stored and extendable (`server/utils/reviewerDeadlines.ts`) but nothing ever acts on them once they pass — no reminder, no escalation, display-only. File cleanup (from the upload-ownership-safety phase) needs somewhere to run periodically instead of relying on manual triggering. Rate limiting (`server/middleware/rate-limit.ts`) only covers a handful of request-time routes; there's no protection against sustained abuse of endpoints that aren't naturally self-limiting.

## Symptoms

- Overdue reviews are only visible as a UI badge color — never surfaced to an editor or nudged to the reviewer.
- Orphaned-file cleanup (once built) has no natural place to run on a recurring basis.
- No organization-wide mechanism exists for anything that needs to happen on a schedule rather than in response to a request.

## Affected files / functions

- New: a scheduled-job entry point (Vercel Cron config or equivalent)
- `server/utils/reviewerDeadlines.ts` (consumer for the new reminder job)
- The cleanup logic from the upload-ownership-safety phase (moves from a manually-triggered endpoint to a scheduled one)
- `server/middleware/rate-limit.ts` (extend coverage to remaining write-heavy endpoints)

## Blast radius

Additive only — this phase does not change any existing request-time behavior; it adds new scheduled behavior alongside it.

## Constraints

- Depends on the upload-ownership-safety phase having already built the first cleanup job as a callable unit.
- Depends on the auth-identity-hardening phase's rate-limiter path fixes being in place, so this phase extends a working mechanism rather than building on top of the two previously-dead entries.

## Edge cases

A deadline-reminder job must not notify a reviewer who already submitted between the deadline passing and the job running — it needs to re-check current status immediately before sending.
