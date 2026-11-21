// Friendly, academic-facing labels for values the system stores in code form.
// Project rule (CLAUDE.md, "Audience"): users never see raw values like `under_review`.
// The stored value stays exact; only what is shown changes.

/** Turns `some_value` into "Some value" — the fallback for anything not listed below. */
export function humanize(value: string): string {
  const words = value.replaceAll(/[_-]/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Values from server/db/schema/manuscriptVersions.ts (versionStatusEnum).
const VERSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected'
}

export function versionStatusLabel(status: string): string {
  return VERSION_STATUS_LABELS[status] ?? humanize(status)
}

// Every `resourceType` the server writes to the audit log (tests/displayLabels.test.ts checks this).
// In this codebase a "journal" record is a manuscript submission.
export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  journal: 'Manuscript',
  reviewer: 'Reviewer',
  user: 'User account',
  role: 'Role',
  user_role: 'User role',
  category: 'Subject category',
  sub_category: 'Subcategory',
  sub_sub_category: 'Sub-subcategory',
  editorial_board_member: 'Editorial board member',
  upload: 'Uploaded file',
  admin_audit_log: 'Activity log',
  system_email: 'System email'
}

export function auditResourceLabel(resourceType: string): string {
  return AUDIT_RESOURCE_LABELS[resourceType] ?? humanize(resourceType)
}

// Actions whose plain humanized form reads awkwardly; the rest (e.g. `manuscript_published`)
// already read well through humanize().
const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  export: 'Log exported',
  cleanup: 'Old log entries cleared',
  role_assign: 'Role assigned',
  role_remove: 'Role removed',
  permission_sync: 'Permissions updated',
  email_sent: 'Email sent',
  ping_sent: 'Reminder sent',
  notice_sent: 'Notice sent'
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? humanize(action)
}

// Values from server/utils/adminAuditCore.ts (AdminAuditRiskLevel).
export function riskLevelLabel(riskLevel: string): string {
  return humanize(riskLevel)
}
