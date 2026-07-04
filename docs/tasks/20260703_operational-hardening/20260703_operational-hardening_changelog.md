# Changelog — Operational hardening (scheduled jobs & rate limiting)

## Layer 1 — High-level

The app now has a scheduled-execution mechanism (Vercel Cron) for the first time. The orphaned-upload cleanup job from the upload-ownership-safety phase runs automatically once a day instead of relying on someone remembering to trigger it manually (the manual endpoint stays as an operator escape hatch — documented decision, not an oversight). A new deadline-reminder job notifies an in-progress reviewer once, by email and in-app notification, when their deadline is within 48 hours or already passed — and re-verifies their status immediately before sending so a reviewer who just submitted doesn't get a stale "overdue" nudge. Rate limiting now also covers manuscript creation and the five reviewer decision endpoints.

## Layer 2 — Low-level

- **`vercel.json`** (new) — two daily cron entries: `/api/cron/cleanup-files` (03:00 UTC) and `/api/cron/reviewer-deadline-reminders` (08:00 UTC). Daily was chosen deliberately, not just as a safe default: Vercel Cron caps Hobby-plan projects at once-per-day, and daily is already the natural granularity of both jobs (24h upload TTL, 48h reminder window) — confirmed against current Vercel docs rather than assumed (see "Verified against current docs" below).
- **`server/utils/cronAuth.ts`** (new) — `assertCronRequest(event)`: 503 if `CRON_SECRET` isn't configured, 401 if the `Authorization: Bearer <secret>` header doesn't match. This is exactly the mechanism Vercel documents itself sending on every cron invocation.
- **`server/middleware/auth.ts`** — exempted `/api/cron/` from the session gate, following the exact precedent already in this file for `/api/files/upload-token` (a route with no user session, verified by a different mechanism instead).
- **`server/utils/fileOwnership.ts`** — extracted `cleanupOrphanedFiles()` (the actual cleanup logic) out of the admin endpoint so both the new cron endpoint and the kept-as-escape-hatch admin endpoint call the same code.
- **`server/api/cron/cleanup-files.get.ts`** (new), **`server/api/admin/files/cleanup.post.ts`** (updated to call the shared function) — both log via the existing `logAdminAction`; the cron path logs with `userId: null` (no session), which reads correctly as a system/automated action.
- **`server/db/schema/reviewers.ts`**, migration `0012_loud_viper.sql` — added `remindedAt` (nullable timestamp) so a reviewer is only ever reminded once per assignment.
- **`server/utils/reviewerReminders.ts`** (new) — `sendReviewerDeadlineReminders()`: queries `status = 'in-progress'` AND `reviewDeadline` within 48h-or-passed AND `remindedAt IS NULL`, then **re-fetches each candidate individually and re-checks status/remindedAt immediately before sending** — the exact edge case named in the problem doc (a reviewer who submits between the initial query and the send must not get a stale reminder). Sends an in-app notification (`createNotification`) and an email (gated by the existing `review_assignment` email preference — no new preference category was added for this).
- **`server/utils/email.ts`** — added `sendReviewDeadlineReminderEmail`, matching this file's existing template style, with distinct copy for "approaching" vs. "overdue."
- **`server/api/cron/reviewer-deadline-reminders.get.ts`** (new) — thin wrapper: `assertCronRequest` then call the job.
- **`server/middleware/rate-limit.ts`** — added `/api/journals` (10/min) and the five reviewer decision endpoints — `accept`, `decline`, `decline-with-comment`, `submit-review`, `request-change` (20/min each). These are abuse-prevention limits, not UX throttles, per the plan's explicit direction; GET requests to the same paths (the email-link accept/decline flow) are already unconditionally exempt in this middleware, so this doesn't touch that flow at all.
- **`README.md`** — documented `CRON_SECRET` in both the local env var list and the Vercel deployment table.

## Verified against current docs (not assumed)

The solution doc flagged Vercel Cron's interval/reliability guarantees as an unverified constraint that shouldn't be relied on blindly. Checked directly against current Vercel documentation before designing the schedule:
- Cron jobs only run on **Production** deployments — confirmed, noted as an untested-locally path below.
- Requests arrive as **GET**, with `user-agent: vercel-cron/1.0` and an `x-vercel-cron-schedule` header.
- Auth is via `CRON_SECRET` sent as `Authorization: Bearer <secret>` — this is Vercel's own documented mechanism, not something invented for this task.
- **Hobby-plan projects cap cron frequency at once per day** — this directly shaped the schedule choice (daily for both jobs) rather than picking a tighter interval and hoping it deploys correctly regardless of plan tier.

Sources: [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs), [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (35/35) — all pass.
- Live against `nuxt dev` (with a local `CRON_SECRET` set for this test only) + the docker-compose Postgres:
  - `/api/cron/cleanup-files` with no auth header → 401; with a wrong secret → 401; with the correct secret → 200.
  - `/api/cron/reviewer-deadline-reminders`: set a seeded reviewer to `in-progress` with a deadline 2 days in the past → run → `remindedCount: 1`, `remindedAt` set.
  - Ran the same job again immediately → `remindedCount: 0` (no duplicate reminder).
  - Set a second candidate `in-progress` + overdue, then flipped it to `reviewed` (simulating a last-second submission) before running the job → `remindedCount: 0`, `remindedAt` stayed null — confirms the re-check-before-send behavior the problem doc specifically asked for.
  - `/api/journals` POST under normal low-volume use (3 requests) unaffected by the new rate limit (10/min).
  - Admin manual cleanup endpoint (`/api/admin/files/cleanup`) still works as the documented escape hatch.
  - All test-state mutations (reviewer status/deadline changes) restored afterward.

## Dead code audit

Per the plan's explicit ask: the manually-triggered admin cleanup endpoint **stays**, as a documented operator escape hatch for forcing an immediate cleanup without waiting for the next scheduled run — not removed, not left as an accidental duplicate (it now shares the exact same underlying function as the cron path, so there's no drift risk between the two).

## Untested paths

Per the plan: actual Vercel Cron execution in production (cron jobs only run on Production deployments — this can't be exercised in local dev at all, only simulated by calling the endpoint directly with the correct header, which is what the verification above does).
