// Gates UI on the same resource:action permissions the server enforces (see
// server/utils/permissions.ts requirePermission), instead of hardcoding role names — stays
// correct if an admin reassigns permissions via /api/roles/[id]/permissions. Only covers
// 'any'/'public'-scoped permissions; 'own'/'assigned' ones need record-level context this
// dashboard-wide list doesn't carry (see getUserPermissionActions).
export function useCan() {
  const { data: currentUser } = useCurrentUser()

  return (resource: string, action: string) =>
    currentUser.value.permissions.includes(`${resource}:${action}`)
}
