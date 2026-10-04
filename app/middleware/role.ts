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
    // Copy-desk-only users have one valid editor destination; send them there
    // instead of dumping them on the public homepage with an error banner.
    const isCopyDeskOnly = me.value.roles.includes('copy_desk_editor')
      && !me.value.roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))

    if (isCopyDeskOnly && to.path.startsWith('/editor')) {
      return navigateTo('/editor/copy-desk')
    }

    return navigateTo({
      path: '/',
      query: {
        accessDenied: '1',
        from: to.fullPath
      }
    })
  }
})
