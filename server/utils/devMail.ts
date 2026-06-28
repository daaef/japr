import type { H3Event } from 'h3'

/**
 * Guard for the dev/demo mail viewer.
 *
 * Captured .data/mail files contain reset links, activation codes, and temp passwords.
 * The feature is off by default and must be explicitly enabled with
 * NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true. When disabled we throw 404 so the
 * endpoint's existence is not advertised. No authentication required — this is
 * intended for local/demo use so new registrants can read activation mail before login.
 */
export function assertMailViewerAccess(event: H3Event) {
  const config = useRuntimeConfig(event)

  if (config.public.enableMailViewer !== true) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }
}
