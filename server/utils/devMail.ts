import type { H3Event } from 'h3'

/**
 * Guard for the dev/demo mail viewer.
 *
 * Captured .data/mail files contain reset links, activation codes, and temp passwords.
 * The feature is off by default and must be explicitly enabled with
 * NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true. When disabled we throw 404 so the
 * endpoint's existence is not advertised. No authentication required — this is
 * intended for local/demo use so new registrants can read activation mail before login.
 *
 * Hard-blocked in production regardless of the flag: the flag is public runtime
 * config (visible to the client) and one misconfigured env var on a real deployment
 * would otherwise be enough to expose every user's activation/reset mail. Preview
 * and local environments are unaffected.
 *
 * Vercel sets NODE_ENV=production for BOTH production and preview builds — only
 * VERCEL_ENV ('production' | 'preview' | 'development') tells them apart there, so
 * check that first and only fall back to NODE_ENV off Vercel (e.g. self-hosted).
 */
export function assertMailViewerAccess(event: H3Event) {
  const config = useRuntimeConfig(event)
  const isRealProduction = process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === 'production'
    : process.env.NODE_ENV === 'production'

  if (isRealProduction || config.public.enableMailViewer !== true) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }
}
