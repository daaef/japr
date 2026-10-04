export type AdminAuditRiskLevel = 'low' | 'medium' | 'high'

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'newPassword',
  'oldPassword',
  'token',
  'secret',
  'sessionToken'
])

const HIGH_RISK_ACTIONS = new Set([
  'delete',
  'role_assign',
  'role_remove',
  'permission_grant',
  'permission_revoke',
  'system_config',
  'cleanup',
  'manuscript_published',
  'manuscript_declined',
  'manuscript_desk_declined',
  'manuscript_revisions_requested',
  'review_change_requested'
])

const MEDIUM_RISK_ACTIONS = new Set([
  'create',
  'update',
  'status_change',
  'import',
  'export',
  'email_sent',
  'manuscript_created',
  'manuscript_updated',
  'manuscript_revision_submitted',
  'manuscript_approved',
  'manuscript_approved_for_publication',
  'manuscript_sent_to_review',
  'reviewer_assigned',
  'reviewer_unassigned',
  'review_accepted',
  'review_declined',
  'review_submitted',
  'extension_approved',
  'extension_requested',
  'notice_sent'
])

export function getAuditRiskLevel(action: string): AdminAuditRiskLevel {
  if (HIGH_RISK_ACTIONS.has(action)) {
    return 'high'
  }

  if (MEDIUM_RISK_ACTIONS.has(action)) {
    return 'medium'
  }

  return 'low'
}

export function sanitizeAuditValues(values?: Record<string, unknown> | null) {
  if (!values) {
    return null
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '[redacted]' : value
    ])
  )
}
