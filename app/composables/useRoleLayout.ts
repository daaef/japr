import { resolveRoleLayout, type RoleLayout } from '~/utils/workspace'

export function useRoleLayout() {
  const asyncUser = useCurrentUser()
  const { data: currentUser } = asyncUser

  const layoutName = computed<RoleLayout>(() => {
    return resolveRoleLayout(currentUser.value?.roles ?? [])
  })

  async function applyRoleLayout() {
    // Wait for the current-user fetch this composable already kicked off so
    // `layoutName` reflects the real roles instead of the logged-out default on a
    // hard client refresh, where the async fetch hasn't resolved yet.
    await asyncUser
    setPageLayout(layoutName.value)
  }

  return {
    layoutName,
    applyRoleLayout
  }
}
