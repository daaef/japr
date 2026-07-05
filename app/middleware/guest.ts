import { useCurrentUser } from '~/composables/useCurrentUser'
import { resolveWorkspacePath } from '~/utils/workspace'

export default defineNuxtRouteMiddleware(async () => {
  const { data: me } = await useCurrentUser()

  if (me.value.authenticated) {
    return navigateTo(resolveWorkspacePath(me.value.roles, {
      hasInterests: me.value.hasInterests
    }))
  }
})
