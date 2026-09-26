import { useCurrentUser } from '~/composables/useCurrentUser'
import { resolveRoleLayout } from '~/utils/workspace'

export default defineNuxtRouteMiddleware(async () => {
  const { data: me } = await useCurrentUser()
  const layout = resolveRoleLayout(me.value.roles)

  if (layout === 'public') {
    throw createError({ statusCode: 403, statusMessage: 'No workspace is available for this account.' })
  }

  setPageLayout(layout)
})
