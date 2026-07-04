import { getHeader, type H3Event } from 'h3'

/**
 * Verifies a request actually came from Vercel Cron rather than an arbitrary caller.
 * Vercel automatically sends the CRON_SECRET env var as `Authorization: Bearer <secret>`
 * on every cron invocation — https://vercel.com/docs/cron-jobs/manage-cron-jobs.
 */
export function assertCronRequest(event: H3Event) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'CRON_SECRET is not configured. Scheduled jobs are disabled until it is set.'
    })
  }

  const authHeader = getHeader(event, 'authorization')

  if (authHeader !== `Bearer ${secret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' })
  }
}
