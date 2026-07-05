import { useCurrentUser } from '~/composables/useCurrentUser'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: me } = await useCurrentUser()

  if (!me.value.authenticated) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }

  // Already accepted the review policy — don't show the acceptance page again.
  if (to.path === '/review-policy' && me.value.user?.reviewPolicyAccepted) {
    if (me.value.roles.some(role => ['associate_editor', 'external_reviewer', 'desk_editor'].includes(role))) {
      return navigateTo('/reviewer')
    }
    return navigateTo('/author/submit')
  }

  // Routes that require review policy acceptance
  const requiresPolicyAcceptance = [
    '/author/submissions',
    '/reviewer'
  ]

  const needsPolicyCheck = requiresPolicyAcceptance.some(route =>
    to.path.startsWith(route)
  )

  // Check if user has accepted review policy for submission/review routes
  if (needsPolicyCheck && !me.value.user?.reviewPolicyAccepted) {
    return navigateTo('/review-policy')
  }
})
