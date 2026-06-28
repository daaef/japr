import { fetchCurrentUser } from '~/composables/useCurrentUser'

export default defineNuxtRouteMiddleware(async (to) => {
  const me = await fetchCurrentUser()

  if (!me?.authenticated) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
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
  if (needsPolicyCheck && !me.user?.reviewPolicyAccepted) {
    return navigateTo('/review-policy')
  }
})
