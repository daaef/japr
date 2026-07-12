const ACTIVE_LINK_CLASS = 'bg-primary text-white'
const INACTIVE_LINK_CLASS = 'text-muted hover:bg-primary-50 hover:text-primary'

// Dark-chrome variants: for sidebars on brick-950 (Editor/Reviewer/Admin), where
// text-muted/text-dimmed aren't legible — see design_handoff_japr_redesign dashboards.
const ACTIVE_LINK_CLASS_DARK = 'bg-brick-500 text-white'
const INACTIVE_LINK_CLASS_DARK = 'text-brick-300 hover:bg-white/5 hover:text-white'

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

  function linkClassDark(active: boolean) {
    return active ? ACTIVE_LINK_CLASS_DARK : INACTIVE_LINK_CLASS_DARK
  }

  function dashboardLinkClass(path: string, exact = false) {
    return linkClass(exact ? isExactPath(path) : isActivePath(path))
  }

  function dashboardLinkClassDark(path: string, exact = false) {
    return linkClassDark(exact ? isExactPath(path) : isActivePath(path))
  }

  function dashboardSubLinkClass(path: string) {
    return isActivePath(path)
      ? 'text-primary font-semibold'
      : 'text-muted hover:text-primary'
  }

  function dashboardSubLinkClassDark(path: string) {
    return isActivePath(path)
      ? 'text-white font-semibold'
      : 'text-brick-300 hover:text-white'
  }

  // Sidebar dropdown-group accordion: auto-opens whenever the current route
  // enters the group (fixes the old script-driven version never re-evaluating
  // on client-side navigation), while still letting the user manually collapse
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
    linkClassDark,
    dashboardLinkClass,
    dashboardLinkClassDark,
    dashboardSubLinkClass,
    dashboardSubLinkClassDark,
    useSidebarGroup
  }
}
