import { fetchCurrentUser } from '~/composables/useCurrentUser'
import { resolveWorkspacePath } from '~/utils/workspace'

export default defineNuxtRouteMiddleware(async () => {
  const me = await fetchCurrentUser()

  if (me?.authenticated) {
    return navigateTo(resolveWorkspacePath(me.roles, {
      hasInterests: me.hasInterests
    }))
  }
})
