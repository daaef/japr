export function useDashboardNavigation() {
  const route = useRoute()

  function isExactPath(path: string) {
    return route.path === path || route.path === `${path}/`
  }

  function isActivePath(path: string) {
    return isExactPath(path) || route.path.startsWith(`${path}/`)
  }

  function dashboardLinkClass(path: string, exact = false) {
    return {
      active: exact ? isExactPath(path) : isActivePath(path)
    }
  }

  return {
    isExactPath,
    isActivePath,
    dashboardLinkClass
  }
}
