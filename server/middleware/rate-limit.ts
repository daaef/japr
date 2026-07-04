const buckets = new Map<string, { count: number, resetAt: number }>()

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
  '/api/reviewer/journals/request-change': { max: 20, windowMs: 60_000 }
}

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const limit = limits[path]

  if (!limit || event.method === 'GET') {
    return
  }

  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || getRequestIP(event) || 'unknown'
  const key = `${ip}:${path}`
  const now = Date.now()
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
