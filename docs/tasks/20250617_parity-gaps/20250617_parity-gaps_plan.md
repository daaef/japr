# Plan — Laravel parity P1 gaps

## Steps

1. **Download API** — `server/api/journals/[id]/download.get.ts`  
   Complexity: low  
   AC: Authenticated user can download approved journal file as attachment.

2. **Download UI** — `app/pages/journals/[slug].vue`  
   Complexity: trivial  
   AC: Download button visible when journal is approved and user is logged in.

3. **Author dashboard** — `app/pages/author/index.vue`  
   Complexity: medium  
   AC: Four stat cards, recent submissions (3), collections grid match Laravel dashboard content.

4. **Interests gate** — `server/api/me.get.ts`, `app/utils/workspace.ts`, `app/pages/auth/login.vue`, `app/middleware/guest.ts`  
   Complexity: low  
   AC: Author with zero interests redirects to `/author/interests` after login.

5. **Notification preferences** — schema migration, API, `app/pages/notifications/preferences.vue`  
   Complexity: medium  
   AC: User can view/save email and in-app notification toggles.

6. **Notification CSV export** — `server/api/notifications/export.get.ts`, UI button on notifications index  
   Complexity: low  
   AC: Export downloads CSV with date, type, title, message, status.

7. **Version links** — `app/pages/author/submissions/[id].vue`  
   Complexity: trivial  
   AC: Link to `/journals/[slug]/versions` when slug exists.

## Untested paths
- E2E browser flows; manual verification only.

## Regression checklist
- `resolveWorkspacePath` callers: login, guest middleware, JournalNavbar
- `/api/me` consumers: useCurrentUser, auth middleware
- Public journal detail sidebar actions

## Definition of Done
- [ ] App runs without new warnings or errors
- [ ] Every AC verified
- [ ] Regression checklist cleared
- [ ] Dead code audit complete
- [ ] No new any types
- [ ] No new dependencies
- [ ] Changelog written
