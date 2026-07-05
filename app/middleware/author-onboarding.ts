import { useCurrentUser } from '~/composables/useCurrentUser'

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

  const { data: me } = await useCurrentUser()

  if (!me.value.authenticated || !me.value.roles.includes('author')) {
    return
  }

  const hasElevatedRole = me.value.roles.some(role => elevatedRoles.includes(role))

  if (hasElevatedRole || me.value.hasInterests) {
    return
  }

  return navigateTo('/author/interests')
})
