# Solution — Operational hardening (scheduled jobs & rate limiting)

## Proposed approach

Use the platform's own native scheduling (Vercel Cron) rather than introducing a separate always-on worker process or third-party queue — the workload here (two lightweight periodic jobs) doesn't justify new infrastructure.

## Alternatives rejected

- **A long-running Node worker process** — rejected; doesn't fit Vercel's serverless model and adds an entirely new deployment target for two small jobs.
- **A third-party job queue (BullMQ + Redis, etc.)** — rejected as disproportionate until job volume/complexity actually requires it.

## Performance impact

None on request-time paths; new jobs run out-of-band.

## Trade-offs

Vercel Cron's minimum interval and reliability guarantees should be confirmed against current platform documentation before relying on tight timing (e.g., don't promise "reminded within 5 minutes of the deadline") — flagged here as a known unverified constraint rather than assumed.

## Dead code audit

Once step 2 lands, decide and document whether to remove the upload-ownership-safety phase's manually-triggered cleanup endpoint, or keep it explicitly as an operator escape hatch.
