# Layer 1

Seven small parity fixes tighten navigation and security: interests onboarding no longer hijacks profile updates, the public navbar respects interests and missing roles, OAuth lands on the author workspace, download routes require middleware auth, authors can download from submission detail, and dashboard sidebars link to preferences and admin journals.

# Layer 2

| File | Before → After |
|------|----------------|
| `app/pages/author/interests.vue` | Always redirected after save → redirect only when first-time onboarding |
| `app/components/journal/JournalNavbar.vue` | Hardcoded `/author`, missing roles → `workspacePath` with `hasInterests`; added `external_reviewer`, `copy_desk_editor` |
| `app/pages/auth/login.vue` | Google callback `/` → `/author` (onboarding middleware applies) |
| `server/middleware/auth.ts` | All `GET /api/journals/*` public → download paths require session at middleware |
| `server/api/journals/[id]/download.get.ts` | Unused `basename` import removed |
| `app/pages/author/submissions/[id].vue` | No download → Download manuscript link when `journalUrl` set |
| `app/layouts/admin.vue` | No journals/preferences nav → both added |
| `app/layouts/editor.vue` | No preferences nav → Notification Preferences link |
| `app/layouts/reviewer.vue` | No preferences nav → Notification Preferences link |
