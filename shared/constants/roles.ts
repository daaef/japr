export const roleKeys = [
  'admin',
  'editor_in_chief',
  'managing_editor',
  'associate_editor',
  'external_reviewer',
  'author',
  'copy_desk_editor'
] as const

export type RoleKey = (typeof roleKeys)[number]

export const editorRoleKeys = ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor'] as const
export const reviewerRoleKeys = ['associate_editor', 'external_reviewer'] as const

// `requiredRoles` allow-lists for definePageMeta, grouped to match the six distinct
// literal arrays that were previously duplicated inline across ~50 pages.
export const ADMIN_ROLES = ['admin'] as const
export const AUTHOR_ROLES = ['author', 'admin'] as const
export const EDITOR_ROLES = editorRoleKeys
export const REVIEWER_ROLES = ['admin', ...reviewerRoleKeys] as const

export function hasEditorRole(roles: readonly string[]): boolean {
  return roles.some(role => (editorRoleKeys as readonly string[]).includes(role))
}

export function hasReviewerRole(roles: readonly string[]): boolean {
  return roles.some(role => (reviewerRoleKeys as readonly string[]).includes(role))
}
