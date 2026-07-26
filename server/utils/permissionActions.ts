import { permissionDefinitions } from '#shared/constants/permissions'

export interface PermissionRow {
  roleName: string
  resource: string
  action: string
  scope: string | null
}

// Pure: derives the checkable resource:action list from already-fetched permission rows.
// Kept free of ./session (which pulls in h3, only resolvable inside Nuxt's Nitro build) so
// this stays importable from tests/permissions.test.ts under plain `tsx --test`.
export function derivePermissionActions(permissionRows: PermissionRow[]): string[] {
  const isAdmin = permissionRows.some(row => row.roleName === 'admin')

  // Mirrors checkUserPermission's own admin bypass (server/utils/permissions.ts) rather than
  // relying solely on admin's seeded rows, so a newly-added permission shows up for admin
  // immediately.
  if (isAdmin) {
    return permissionDefinitions.map(permission => `${permission.resource}:${permission.action}`)
  }

  const actions = new Set<string>()
  for (const row of permissionRows) {
    // 'own'/'assigned' need per-record context (ownerId/reviewerUserId) this list can't
    // carry — only surface what's safe to check with no extra context.
    if (row.scope === 'any' || row.scope === 'public') {
      actions.add(`${row.resource}:${row.action}`)
    }
  }

  return [...actions]
}
