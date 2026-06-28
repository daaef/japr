import { resolveRoleLayout, type RoleLayout } from '~/utils/workspace'

export function useRoleLayout() {
  const { data: currentUser } = useCurrentUser()

  const layoutName = computed<RoleLayout>(() => {
    return resolveRoleLayout(currentUser.value?.roles ?? [])
  })

  function applyRoleLayout() {
    setPageLayout(layoutName.value)
  }

  return {
    layoutName,
    applyRoleLayout
  }
}
