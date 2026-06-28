export const roleKeys = [
  'admin',
  'editor_in_chief',
  'managing_editor',
  'associate_editor',
  'external_reviewer',
  'author',
  'desk_editor',
  'copy_desk_editor'
] as const

export type RoleKey = (typeof roleKeys)[number]

export const editorRoleKeys = ['admin', 'editor_in_chief', 'managing_editor'] as const
export const reviewerRoleKeys = ['associate_editor', 'external_reviewer', 'desk_editor'] as const

export function hasEditorRole(roles: readonly string[]): boolean {
  return roles.some(role => (editorRoleKeys as readonly string[]).includes(role))
}

export function hasReviewerRole(roles: readonly string[]): boolean {
  return roles.some(role => (reviewerRoleKeys as readonly string[]).includes(role))
}
