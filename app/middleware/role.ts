import { fetchCurrentUser } from '~/composables/useCurrentUser'

export default defineNuxtRouteMiddleware(async (to) => {
  const requiredRoles = Array.isArray(to.meta.requiredRoles) ? to.meta.requiredRoles : []

  if (!requiredRoles.length) {
    return
  }

  const me = await fetchCurrentUser()

  if (!me?.authenticated) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  if (!requiredRoles.some(role => me.roles.includes(role))) {
    return navigateTo({
      path: '/',
      query: {
        accessDenied: '1',
        from: to.fullPath
      }
    })
  }
})
