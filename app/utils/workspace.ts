export type RoleLayout = 'admin' | 'editor' | 'reviewer' | 'author' | 'public'

export function resolveRoleLayout(roles: string[]): RoleLayout {
  if (roles.includes('admin')) {
    return 'admin'
  }

  if (roles.includes('editor_in_chief') || roles.includes('managing_editor') || roles.includes('copy_desk_editor')) {
    return 'editor'
  }

  if (roles.includes('associate_editor') || roles.includes('external_reviewer') || roles.includes('desk_editor')) {
    return 'reviewer'
  }

  if (roles.includes('author')) {
    return 'author'
  }

  return 'public'
}

export function resolveWorkspacePath(roles: string[], options?: { hasInterests?: boolean }) {
  if (roles.includes('admin')) {
    return '/admin'
  }

  if (roles.includes('editor_in_chief') || roles.includes('managing_editor')) {
    return '/editor'
  }

  if (roles.includes('copy_desk_editor')) {
    return '/editor/copy-desk'
  }

  if (roles.includes('associate_editor') || roles.includes('external_reviewer') || roles.includes('desk_editor')) {
    return '/reviewer'
  }

  if (roles.includes('author')) {
    if (options?.hasInterests === false) {
      return '/author/interests'
    }
    return '/author'
  }

  return '/'
}
