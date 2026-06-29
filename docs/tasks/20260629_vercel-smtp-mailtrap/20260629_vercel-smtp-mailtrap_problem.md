# Problem — Signup email fails on Vercel (500 → 409 trap)

## Root cause

`EMAIL_TRANSPORT=local` writes activation mail to `.data/mail/` on disk, but Vercel's serverless filesystem is read-only, so email throws after the user row is already committed.

## Symptoms

- First `POST /api/auth/sign-up` on `https://japr.vercel.app` returns **500** (email write fails).
- The user/account/activation rows are already persisted, so a retry returns **409** "Email is already registered." (the reported error).
- No way for testers to read captured mail on the deployed site — the local `/mail` viewer reads disk files that never exist on Vercel.

## Affected files / functions

- `server/utils/email.ts:71-84` — `sendEmail()` only supports `resend`/`local`; `writeLocalEmail()` (`51-68`) does `mkdir`/`writeFile`.
- `server/api/auth/sign-up.post.ts:29-66` — sequential inserts then email, no transaction, no email error handling.
- `server/api/dev/mail.get.ts`, `server/api/dev/mail/[id].get.ts` — read only local files via `listLocalEmails`/`getLocalEmail`.
- `app/pages/mail/index.vue` — renders `MailRecord[]` from `/api/dev/mail`.

## Blast radius

- All transactional mail: activation, registration, password reset, review/decision/notification emails (all route through `sendEmail`).
- `/mail` viewer and its two `/api/dev/mail*` endpoints.
- Vercel env configuration (out of repo).

## Constraints

- No persistent local filesystem on Vercel.
- Keep local dev (`EMAIL_TRANSPORT=local`) and the existing Resend path working.
- `/mail` viewer stays off by default (`NUXT_PUBLIC_ENABLE_MAIL_VIEWER`); it exposes codes/links so it must remain opt-in.
- No change to the `MailRecord` shape the page consumes.

## Edge cases

- Email provider transient failure must not orphan a half-created user or dead-end retries on 409.
- Mailtrap **sandbox** (no real delivery, no domain) vs **live sending** (needs verified domain) — both reachable via generic SMTP.
- Mailtrap viewer configured but API token invalid/expired → surface a clear error, not a silent empty inbox.
- Empty inbox / message with no HTML body.
