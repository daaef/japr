import type { RoleKey } from './roles'

export type PermissionScope = 'any' | 'own' | 'assigned' | 'public' | null

export interface PermissionDefinition {
  name: string
  resource: string
  action: string
  scope: PermissionScope
  description: string
}

export interface SystemRoleDefinition {
  name: RoleKey
  description: string
  isSystem: boolean
  permissions: string[]
}

export const permissionDefinitions: PermissionDefinition[] = [
  { name: 'create-users', resource: 'user', action: 'create', scope: 'any', description: 'Create new users.' },
  { name: 'edit-users', resource: 'user', action: 'update', scope: 'any', description: 'Update users.' },
  { name: 'delete-users', resource: 'user', action: 'delete', scope: 'any', description: 'Suspend or delete users.' },
  { name: 'submit-manuscript', resource: 'journal', action: 'create', scope: 'own', description: 'Submit manuscript.' },
  { name: 'edit-own-manuscript', resource: 'journal', action: 'update', scope: 'own', description: 'Edit own manuscript.' },
  { name: 'upload-revision', resource: 'journal', action: 'revision', scope: 'own', description: 'Upload revision.' },
  { name: 'assign-reviewers', resource: 'reviewer', action: 'assign', scope: 'any', description: 'Assign reviewers and associate editors.' },
  { name: 'manage-review-process', resource: 'review', action: 'manage', scope: 'any', description: 'Manage reviews.' },
  { name: 'request-revisions', resource: 'journal', action: 'request_revisions', scope: 'any', description: 'Request revisions.' },
  { name: 'coordinate-reviews', resource: 'review', action: 'coordinate', scope: 'any', description: 'Coordinate reviews.' },
  { name: 'review-manuscript', resource: 'review', action: 'submit', scope: 'assigned', description: 'Submit assigned review.' },
  { name: 'provide-feedback', resource: 'review', action: 'feedback', scope: 'assigned', description: 'Provide review feedback.' },
  { name: 'send-approval-notice', resource: 'journal', action: 'send_approval_notice', scope: 'any', description: 'Send approval notice.' },
  { name: 'send-decline-notice', resource: 'journal', action: 'send_decline_notice', scope: 'any', description: 'Send decline notice.' },
  { name: 'final-approve-manuscript', resource: 'journal', action: 'approve', scope: 'any', description: 'Approve manuscript.' },
  { name: 'final-reject-manuscript', resource: 'journal', action: 'reject', scope: 'any', description: 'Reject manuscript.' },
  { name: 'publish-manuscript', resource: 'journal', action: 'publish', scope: 'any', description: 'Publish manuscript.' },
  { name: 'copy-edit-manuscript', resource: 'journal', action: 'copy_edit', scope: 'any', description: 'Copy edit manuscript.' },
  { name: 'final-edit-manuscript', resource: 'journal', action: 'final_edit', scope: 'any', description: 'Final edit manuscript.' },
  { name: 'prepare-for-publication', resource: 'journal', action: 'prepare_publication', scope: 'any', description: 'Prepare for publication.' },
  { name: 'read-public-journals', resource: 'journal', action: 'read', scope: 'public', description: 'Read public journals.' },
  { name: 'read-notifications', resource: 'notification', action: 'read', scope: 'own', description: 'Read notifications.' },
  { name: 'read-categories', resource: 'category', action: 'read', scope: 'public', description: 'Read category tree.' }
]

export const systemRoles: SystemRoleDefinition[] = [
  {
    name: 'admin',
    description: 'Full system access',
    isSystem: true,
    permissions: permissionDefinitions.map(permission => permission.name)
  },
  {
    name: 'editor_in_chief',
    description: 'Strategic editorial oversight',
    isSystem: true,
    permissions: [
      'final-approve-manuscript',
      'final-reject-manuscript',
      'publish-manuscript',
      'request-revisions',
      'read-public-journals'
    ]
  },
  {
    name: 'managing_editor',
    description: 'Operational management',
    isSystem: true,
    permissions: [
      'assign-reviewers',
      'send-approval-notice',
      'send-decline-notice',
      'request-revisions',
      'read-public-journals'
    ]
  },
  {
    name: 'associate_editor',
    description: 'Peer reviewer',
    isSystem: true,
    permissions: [
      'manage-review-process',
      'request-revisions',
      'coordinate-reviews',
      'review-manuscript',
      'provide-feedback',
      'read-public-journals'
    ]
  },
  {
    name: 'external_reviewer',
    description: 'Review only',
    isSystem: true,
    permissions: [
      'review-manuscript',
      'provide-feedback',
      'read-public-journals'
    ]
  },
  {
    name: 'author',
    description: 'Submitter',
    isSystem: true,
    permissions: [
      'submit-manuscript',
      'edit-own-manuscript',
      'upload-revision',
      'read-public-journals',
      'read-notifications',
      'read-categories'
    ]
  },
  {
    name: 'desk_editor',
    description: 'Editorial desk',
    isSystem: true,
    permissions: [
      'manage-review-process',
      'coordinate-reviews',
      'review-manuscript',
      'provide-feedback',
      'read-public-journals'
    ]
  },
  {
    name: 'copy_desk_editor',
    description: 'Final editing',
    isSystem: true,
    permissions: [
      'copy-edit-manuscript',
      'final-edit-manuscript',
      'prepare-for-publication',
      'read-public-journals'
    ]
  }
]
