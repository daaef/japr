import { fetchCurrentUser } from '~/composables/useCurrentUser'

const elevatedRoles = [
  'admin',
  'editor_in_chief',
  'managing_editor',
  'associate_editor',
  'external_reviewer',
  'desk_editor',
  'copy_desk_editor'
]

export default defineNuxtRouteMiddleware(async (to) => {
  // Only gate manuscript submission. Other author pages stay reachable so users
  // are not trapped on the interests screen while browsing the author workspace.
  if (!to.path.startsWith('/author/submit')) {
    return
  }

  const me = await fetchCurrentUser()

  if (!me.authenticated || !me.roles.includes('author')) {
    return
  }

  const hasElevatedRole = me.roles.some(role => elevatedRoles.includes(role))

  if (hasElevatedRole || me.hasInterests) {
    return
  }

  return navigateTo('/author/interests')
})
