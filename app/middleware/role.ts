import { useCurrentUser } from '~/composables/useCurrentUser'

export default defineNuxtRouteMiddleware(async (to) => {
  const requiredRoles = Array.isArray(to.meta.requiredRoles) ? to.meta.requiredRoles : []

  if (!requiredRoles.length) {
    return
  }

  const { data: me } = await useCurrentUser()

  if (!me.value.authenticated) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  if (!requiredRoles.some(role => me.value.roles.includes(role))) {
    return navigateTo({
      path: '/',
      query: {
        accessDenied: '1',
        from: to.fullPath
      }
    })
  }
})
