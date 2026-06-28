# Parity quick wins (round 2)

> Completed: 2025-06-17  
> Files changed: interests.vue, JournalNavbar.vue, login.vue, auth.ts (middleware), download.get.ts, author/submissions/[id].vue, admin/editor/reviewer layouts  
> Checklist items fixed: 7

---

## What happened (Layman)

After the first parity pass, a second review found small but annoying gaps — like a door that looked locked but wasn't quite, or a GPS that sent you home when you only wanted to update your hobbies. We fixed seven of those: saving research interests no longer kicks you to the dashboard unless it's your first time; the top menu sends new authors to pick interests before the dashboard; Google sign-in lands in the author area; manuscript downloads are properly login-protected; authors can download their own file from the submission page; and admin/editor/reviewer menus now include notification settings (and admin can reach the journals list).

---

## How it works (Pseudocode)

1. When saving interests, remember whether the user had zero interests before saving.
2. If they had zero and picked at least one, send them to the author dashboard (onboarding complete).
3. If they already had interests, stay on the page and show "Interests updated."
4. Build the dashboard link from role + whether interests exist (same helper as login).
5. Google OAuth return URL set to `/author` so onboarding middleware runs.
6. API guard: allow public read for journal browse/search, but not for `/download` URLs.
7. Show download button on submission detail when a file exists.
8. Add sidebar links for preferences and admin journals.

---

## The implementation (Code-level)

**Changed files:**
- `app/pages/author/interests.vue` — `isOnboarding` flag before POST
- `app/components/journal/JournalNavbar.vue` — `workspacePath` computed
- `app/pages/auth/login.vue` — `callbackURL: '/author'`
- `server/middleware/auth.ts` — `isPublicJournalGet()` excludes download
- `app/pages/author/submissions/[id].vue` — download anchor
- `app/layouts/admin.vue`, `editor.vue`, `reviewer.vue` — preferences + journals nav

**Key change (interests):**
```ts
const isOnboarding = interestData.value.interests.length === 0
// ... after successful save:
if (isOnboarding && selectedIds.value.length > 0) {
  await navigateTo('/author')
}
```

**Key change (middleware):**
```ts
function isPublicJournalGet(path: string) {
  if (!path.startsWith('/api/journals')) return false
  if (path.endsWith('/download') || path.includes('/download/')) return false
  return true
}
```

---

## Why this way (Advanced)

- **Single source of truth:** `resolveWorkspacePath(roles, { hasInterests })` keeps login, guest middleware, and navbar consistent (DRY).
- **Defense in depth:** Download handler already checked auth; excluding download from the public GET prefix means middleware rejects anonymous requests before handler logic — fail-fast at the edge.
- **Onboarding vs profile edit:** Capturing `isOnboarding` before the POST avoids a race where refreshed data makes every save look like an update.
- **OAuth callback to `/author`:** Relies on existing `author-onboarding` middleware rather than a new callback page — minimum surface area.
- **Alternatives rejected:** Dedicated `/auth/callback` page (more files for same behavior); always redirect after interests save (bad UX for returning users).

---

## Verification

- [ ] `pnpm typecheck` passes with no new errors
- [ ] Log in as author with no interests → lands on `/author/interests`; save → `/author`
- [ ] Log in as author with interests → edit interests → stays on page, no redirect
- [ ] Navbar "Dashboard" for new author → `/author/interests` not `/author`
- [ ] `GET /api/journals/{id}/download` without cookie → 401 from middleware
- [ ] Author submission detail → "Download manuscript" downloads file when logged in
- [ ] Admin sidebar → "Manage Journals" and "Notification Preferences" visible
- [ ] Editor/reviewer sidebar → "Notification Preferences" links to `/notifications/preferences`
