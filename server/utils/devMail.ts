import type { H3Event } from 'h3'
import { requireAdmin } from '#server/utils/permissions'

/**
 * Guard for the dev/demo mail viewer.
 *
 * The captured .data/mail files contain reset links, activation codes and admin
 * temporary passwords, so this is locked down on two axes:
 *  1. The feature must be explicitly enabled — either NUXT_ENABLE_MAIL_VIEWER=true,
 *     or (for local convenience) a non-production server using the local file transport.
 *  2. The caller must be an admin.
 * When disabled we throw 404 so the endpoint's existence isn't advertised.
 */
export async function assertMailViewerAccess(event: H3Event) {
  const config = useRuntimeConfig(event)
  const enabledByFlag = config.enableMailViewer === true
  const localDev = process.env.NODE_ENV !== 'production'
    && (process.env.EMAIL_TRANSPORT ?? 'local').toLowerCase() === 'local'

  if (!enabledByFlag && !localDev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found.' })
  }

  await requireAdmin(event)
}
