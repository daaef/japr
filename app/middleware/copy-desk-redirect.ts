// After promoting copy_desk_editor into editorRoleKeys (20261004_promote-copy-desk),
// copy desk editors have full editor dashboard access. This middleware is kept as a
// no-op so existing page registrations that reference it don't break.
export default defineNuxtRouteMiddleware(() => {})
