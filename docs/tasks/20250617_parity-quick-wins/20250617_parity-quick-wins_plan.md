# Plan — parity quick wins

1. **Interests redirect guard** — `app/pages/author/interests.vue` — trivial — redirect only on first onboarding save
2. **Navbar workspace paths** — `JournalNavbar.vue` — low — hasInterests + external_reviewer + copy_desk_editor
3. **OAuth callback** — `app/pages/auth/login.vue` — trivial — callbackURL `/author`
4. **Auth middleware** — `server/middleware/auth.ts` — low — exclude `/download` from public journals GET
5. **Download cleanup** — `download.get.ts` — trivial — remove unused import
6. **Author submission download** — `author/submissions/[id].vue` — trivial — download link when file exists
7. **Dashboard sidebars** — `admin.vue`, `editor.vue`, `reviewer.vue` — low — preferences + admin journals links

## Definition of Done
- [ ] typecheck passes
- [ ] Each AC manually verifiable
- [ ] Changelog written
