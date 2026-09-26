/**
 * Typed access to E2E environment variables.
 * Throws immediately if a required variable is missing so tests fail fast
 * with a clear message instead of a cryptic "cannot read undefined" later.
 */

function required(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}. Check .env.test`)
  }
  return value
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const env = {
  baseUrl: optional('E2E_BASE_URL', 'https://japr.vercel.app'),

  mailtrap: {
    apiToken: required('MAILTRAP_API_TOKEN'),
    accountId: required('MAILTRAP_ACCOUNT_ID'),
    inboxId: required('MAILTRAP_INBOX_ID')
  },

  accounts: {
    admin: { email: required('E2E_ADMIN_EMAIL'), password: required('E2E_ADMIN_PASSWORD') },
    eic: { email: required('E2E_EIC_EMAIL'), password: required('E2E_EIC_PASSWORD') },
    me: { email: required('E2E_ME_EMAIL'), password: required('E2E_ME_PASSWORD') },
    author1: { email: required('E2E_AUTHOR1_EMAIL'), password: required('E2E_AUTHOR1_PASSWORD') },
    author2: { email: required('E2E_AUTHOR2_EMAIL'), password: required('E2E_AUTHOR2_PASSWORD') },
    reviewerA: { email: required('E2E_REVIEWER_A_EMAIL'), password: required('E2E_REVIEWER_A_PASSWORD') },
    reviewerB: { email: required('E2E_REVIEWER_B_EMAIL'), password: required('E2E_REVIEWER_B_PASSWORD') },
    reviewerC: { email: required('E2E_REVIEWER_C_EMAIL'), password: required('E2E_REVIEWER_C_PASSWORD') },
    copyDesk: { email: required('E2E_COPY_DESK_EMAIL'), password: required('E2E_COPY_DESK_PASSWORD') }
  }
} as const
