const ACTIVE_LINK_CLASS = 'bg-primary text-white'
const INACTIVE_LINK_CLASS = 'text-muted hover:bg-primary-50 hover:text-primary'

export function useDashboardNavigation() {
  const route = useRoute()

  function isExactPath(path: string) {
    return route.path === path || route.path === `${path}/`
  }

  function isActivePath(path: string) {
    return isExactPath(path) || route.path.startsWith(`${path}/`)
  }

  function linkClass(active: boolean) {
    return active ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS
  }

  function dashboardLinkClass(path: string, exact = false) {
    return linkClass(exact ? isExactPath(path) : isActivePath(path))
  }

  function dashboardSubLinkClass(path: string) {
    return isActivePath(path)
      ? 'text-primary font-semibold'
      : 'text-muted hover:text-primary'
  }

  // Sidebar dropdown-group accordion: auto-opens whenever the current route
  // enters the group (fixes the old jQuery version never re-evaluating on
  // client-side navigation), while still letting the user manually collapse
  // or reopen it.
  function useSidebarGroup(childPaths: string[]) {
    const isGroupActive = computed(() => childPaths.some(path => isActivePath(path)))
    const open = ref(isGroupActive.value)

    watch(isGroupActive, (active) => {
      if (active) {
        open.value = true
      }
    })

    function toggle() {
      open.value = !open.value
    }

    return reactive({ isGroupActive, open, toggle })
  }

  return {
    isExactPath,
    isActivePath,
    linkClass,
    dashboardLinkClass,
    dashboardSubLinkClass,
    useSidebarGroup
  }
}
