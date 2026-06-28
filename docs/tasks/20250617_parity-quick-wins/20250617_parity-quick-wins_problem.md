# Problem — parity quick wins (round 2)

## Root cause
Follow-up audit found bugs and small gaps in the first parity pass: navigation bypassed interests onboarding, protected download routes matched a public API prefix, and dashboard sidebars lacked links Laravel exposes.

## Symptoms
- Saving interests always redirects to dashboard
- Navbar sends authors to `/author` without checking interests
- Google OAuth lands on `/` and skips onboarding
- Author submission detail has no manuscript download
- Download GET bypasses auth middleware prefix rule
- No notification preferences link in role dashboards; admin journals page orphaned

## Affected files
`app/pages/author/interests.vue`, `app/components/journal/JournalNavbar.vue`, `app/pages/auth/login.vue`, `server/middleware/auth.ts`, `server/api/journals/[id]/download.get.ts`, `app/pages/author/submissions/[id].vue`, `app/layouts/{admin,editor,reviewer}.vue`

## Blast radius
All authenticated roles using public navbar or dashboard sidebars; author submission and download flows.

## Constraints
Minimum effective solution only; no notification dropdown or submit cascade in this pass.

## Edge cases
- Authors updating interests voluntarily must not be redirected
- Users with copy_desk_editor + editor roles use editor dashboard path
