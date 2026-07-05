import { useCurrentUser } from '~/composables/useCurrentUser'

// A copy_desk_editor with no senior editor role only has business on the copy-desk
// queue — send them straight there instead of rendering the full editor dashboard
// first (previously a client-side watch(), which flashed the dashboard on load).
export default defineNuxtRouteMiddleware(async () => {
  const { data: me } = await useCurrentUser()

  const isCopyDeskOnly = me.value.roles.includes('copy_desk_editor')
    && !me.value.roles.some(role => ['admin', 'editor_in_chief', 'managing_editor'].includes(role))

  if (isCopyDeskOnly) {
    return navigateTo('/editor/copy-desk')
  }
})
