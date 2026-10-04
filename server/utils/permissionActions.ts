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
  // Sentinel: *:manage bypasses all checks — expand to every known permission.
  const hasSuperAdmin = permissionRows.some(row => row.resource === '*' && row.action === 'manage')

  if (hasSuperAdmin) {
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
