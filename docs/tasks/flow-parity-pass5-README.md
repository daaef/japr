# Flow Parity Pass 5 — Settings, Auth, Invitations

> Completed: 2025-06-17  
> Files changed: `app/components/SettingsForm.vue`, `server/api/me.get.ts`, `server/api/users/[id]/settings.patch.ts`, `auth.ts`, `app/pages/auth/login.vue`, `app/pages/auth/activate.vue`, `server/api/auth/resend-activation.post.ts`, `app/pages/notifications/preferences.vue`, `server/api/users/[id]/notification-preferences.patch.ts`, `shared/validation/notifications.ts`, `shared/constants/roles.ts`, `shared/constants/researchInterests.ts`, `shared/constants/preferredReviewTypes.ts`, `app/middleware/auth.ts`, `app/middleware/role.ts`, `server/api/editor/journals/[uuid]/assign-reviewers.post.ts`, `server/api/reviewer/journals/accept.get.ts`, `server/api/reviewer/journals/decline.get.ts`, `server/api/editor/journals/approved.get.ts`, `server/api/editor/journals/[uuid].get.ts`, `app/pages/editor/journals/[uuid].vue`, `app/pages/editor/settings.vue`, `server/utils/permissions.ts`  
> Checklist items fixed: 6

---

## What happened (Layman)

Several account and workflow features in JAPR were incomplete compared to the original Journal app. Saving settings could accidentally erase a reviewer's biography, editors could not set their regional expertise, and users who had not activated their email could still sign in. Notification preferences showed editor-only options to everyone, and invitation emails sent reviewers to the wrong links. This pass fixed those functional gaps so account settings, login, notifications, and reviewer invitations behave like the Laravel reference app.

---

## How it works (Pseudocode)

1. When the app loads account settings, fetch the full user profile from `/api/me` including biography, expertise arrays, and reviewer limits.
2. Hydrate every form field from that profile so empty defaults never overwrite stored data on save.
3. Build the save payload based on the user's role so authors only send basic fields.
4. On the server, filter PATCH bodies again by role so direct API calls cannot bypass the UI.
5. Block session creation when `emailVerified` is false; on failed login, resend activation code and send the user to the activate page.
6. Show editor-only notification toggles only when the user has an editorial role (`editor_in_chief`, `managing_editor`, or `admin`).
7. Point invitation emails to one-click accept/decline API routes that preserve the token through login redirect.
8. Allow `copy_desk_editor` to load the approved queue, journal detail, and settings pages.

---

## The implementation (Code-level)

**Changed files:**
- `server/api/me.get.ts` — returns full profile + `preferredReviewTypes`
- `app/components/SettingsForm.vue` — hydration, role-scoped PATCH, multi-selects, email/username, password change, author interests link
- `server/api/users/[id]/settings.patch.ts` — server-side role filtering + email/username uniqueness
- `auth.ts` — rejects sessions for unverified users
- `server/api/auth/resend-activation.post.ts` — regenerates activation code on login attempt
- `shared/constants/roles.ts` — `hasEditorRole()` / `hasReviewerRole()` helpers
- `server/api/editor/journals/[uuid]/assign-reviewers.post.ts` — distinct accept/decline API URLs
- `app/middleware/auth.ts` + `role.ts` — preserve `redirect` query to login

**Key change:**
```ts
// Before — settings save sent empty reviewer defaults
body: { ...form } // biography: '', regionalExpertise: []

// After — role-scoped payload from hydrated form
body: buildSettingsPayload() // only fields relevant to role
```

---

## Why this way (Advanced)

**Data integrity (SRP):** Hydration plus role-scoped PATCH prevents the classic "form defaults clobber DB" bug. Server-side filtering in `settings.patch.ts` closes the bypass where a crafted request could set reviewer fields on an author account.

**Auth lifecycle parity:** Better Auth's `session.create.before` hook is the correct interception point — same effect as Laravel's logout-after-unverified-login, without fighting the session layer after creation.

**Editor role naming:** Journal uses `hasRole('editor')` in Blade but seeds `editor_in_chief` / `managing_editor`. JAPR mirrors the seeded role names via `hasEditorRole()` rather than a non-existent `editor` slug.

**Invitation tokens:** Email links hit state-changing GET handlers (`/api/reviewer/journals/accept|decline`) that mirror Laravel's one-click routes. Login middleware now preserves `?redirect=` so the token survives the auth gate.

**Trade-off:** `copy_desk_editor` can open full editor journal detail pages — broader than ideal but required for copy-desk queue navigation; write actions remain gated by `requireEditor()` on POST routes.

---

## Verification

- [ ] `pnpm typecheck` passes with no new errors
- [ ] Log in as seeded reviewer, open Settings — biography and regional expertise match DB; save without edits — values unchanged
- [ ] Register new user, attempt login before activation — redirected to `/auth/activate?resent=1`, code resent
- [ ] As `editor_in_chief`, open Notification Preferences — "New submissions" checkbox enabled; as author, disabled
- [ ] Assign reviewers from editor journal detail — email accept/decline links hit `/api/reviewer/journals/accept|decline?token=…`
- [ ] Log out, open accept link — login preserves redirect, accept completes after sign-in
- [ ] Log in as `copy_desk_editor` — Copy desk queue loads without 403
