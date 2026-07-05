import type { H3Event } from 'h3'

const buckets = new Map<string, { count: number, resetAt: number }>()

// Buckets live in a per-instance Map: they don't survive a serverless cold start
// and aren't shared across concurrent instances. This limiter is a best-effort
// abuse guard, not a distributed rate limit — swept periodically below so long-running
// instances don't accumulate one entry per (ip, path) forever.
let lastSweepAt = 0
const SWEEP_INTERVAL_MS = 5 * 60_000

function sweepExpiredBuckets(now: number) {
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) {
    return
  }

  lastSweepAt = now
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key)
    }
  }
}

// Vercel's edge is the sole reverse proxy in front of this app: it appends the
// real client IP as the LAST hop rather than replacing the header, so the first
// entry (the one h3's getRequestIP({ xForwardedFor: true }) and the previous
// version of this file used) is still whatever the client sent — trust the last
// entry instead. Falls back to the socket address when there's no proxy at all
// (local dev).
function getTrustedClientIp(event: H3Event) {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const entries = forwarded.split(',').map(entry => entry.trim()).filter(Boolean)
    const trusted = entries.at(-1)
    if (trusted) {
      return trusted
    }
  }

  return getRequestIP(event) ?? 'unknown'
}

const limits: Record<string, { max: number, windowMs: number }> = {
  // better-auth mounts its own routes under /api/auth/[...all] — these must match the
  // paths it actually serves (/sign-in/email, /request-password-reset), not guessed names.
  '/api/auth/sign-in/email': { max: 5, windowMs: 60_000 },
  '/api/auth/sign-up': { max: 3, windowMs: 60_000 },
  '/api/auth/request-password-reset': { max: 3, windowMs: 60_000 },
  '/api/auth/activate': { max: 5, windowMs: 60_000 },
  '/api/auth/resend-activation': { max: 3, windowMs: 60_000 },
  // This route also receives Vercel's server-to-server upload-completed webhook, but
  // that traffic originates from Vercel's own infra IP, not the uploading user's — it
  // forms its own separate bucket here, not the same one this limit is meant to guard.
  '/api/files/upload-token': { max: 10, windowMs: 60_000 },
  // Abuse prevention, not a UX throttle — generous enough that no legitimate author or
  // reviewer should ever notice. GET requests to these same paths (e.g. accept/decline's
  // email-link flow) are already exempt below and unaffected.
  '/api/journals': { max: 10, windowMs: 60_000 },
  '/api/reviewer/journals/accept': { max: 20, windowMs: 60_000 },
  '/api/reviewer/journals/decline': { max: 20, windowMs: 60_000 },
  '/api/reviewer/journals/decline-with-comment': { max: 20, windowMs: 60_000 },
  '/api/reviewer/journals/submit-review': { max: 20, windowMs: 60_000 },
  '/api/reviewer/journals/request-change': { max: 20, windowMs: 60_000 },
  // Public, unauthenticated form (see auth.ts's contact exemption) — needs its own
  // abuse guard since it can't rely on a signed-in user's own request volume.
  '/api/contact': { max: 5, windowMs: 60_000 }
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const limit = limits[path]

  if (!limit || event.method === 'GET') {
    return
  }

  const now = Date.now()
  sweepExpiredBuckets(now)

  const ip = getTrustedClientIp(event)
  const key = `${ip}:${path}`
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs })
    return
  }

  if (bucket.count >= limit.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.'
    })
  }

  bucket.count += 1
})
