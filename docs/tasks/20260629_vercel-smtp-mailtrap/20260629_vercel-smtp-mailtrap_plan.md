# Plan — Vercel SMTP + Mailtrap viewer

## Steps

1. **Add dependency** — `pnpm add nodemailer` + `pnpm add -D @types/nodemailer`.
   Complexity: trivial. AC: `nodemailer` in `package.json` dependencies; install succeeds.

2. **SMTP transport** — in `server/utils/email.ts`, add lazy cached `getSmtpTransport()` and an `smtp` branch in `sendEmail()`; add `mailFrom` from `MAIL_FROM` (falls back to `RESEND_FROM`); add `isProduction` guard that throws if `local` is used in production.
   Complexity: low. AC: with `EMAIL_TRANSPORT=smtp` set, `sendEmail` sends via nodemailer; with `local` + `NODE_ENV=production` it throws a clear error.

3. **Mailtrap viewer util** — new `server/utils/mailtrap.ts`: `isMailtrapViewerConfigured()`, `listMailtrapEmails()`, `getMailtrapEmail(id)` mapping Mailtrap Testing API messages → `MailRecord` shape (bounded to 30 most recent, parallel body fetch).
   Complexity: medium. AC: returns records with `id/createdAt/to/subject/html/text` from a configured inbox; throws 502 on API error.

4. **Wire endpoints** — `server/api/dev/mail.get.ts` and `server/api/dev/mail/[id].get.ts` choose Mailtrap when `isMailtrapViewerConfigured()`, else local.
   Complexity: trivial. AC: with Mailtrap env set, `/api/dev/mail` returns Mailtrap inbox; without, returns local files (unchanged).

5. **Harden signup** — `server/api/auth/sign-up.post.ts`: wrap the three inserts in `db.transaction`; send mail after commit in try/catch; return `{ ok, emailDelivered, message }`.
   Complexity: low. AC: duplicate email/username still 409 pre-insert; a thrown email error returns 200 `emailDelivered:false`, account exists exactly once.

6. **Config + docs** — add `SMTP_*`, `MAIL_FROM`, `MAILTRAP_*` to `.env`; update `README.md` env + Vercel sections; update `/mail` page intro copy to be source-agnostic.
   Complexity: trivial. AC: `.env` and README list the new vars; mail page copy no longer hardcodes `.data/mail` as the only source.

7. **Verify** — `pnpm lint`, `pnpm typecheck`; write changelog; update `docs/tasks/README.md`.
   Complexity: low. AC: lint + typecheck pass for touched files; changelog present; index row added.

## Untested path disclosure

- Live SMTP send and live Mailtrap API fetch are not exercised by automated tests (no creds in CI); verified by static typecheck + manual run with real Mailtrap credentials.
- `tests/authValidation.test.ts` covers `signUpSchema` only, not the handler.

## Regression checklist (direct callers)

- `sendEmail` callers: all `send*Email` helpers in `server/utils/email.ts` (activation, registration, reset, submission, decision, review, notifications) — unchanged signatures, only transport branch added.
- `listLocalEmails`/`getLocalEmail` callers: `server/api/dev/mail.get.ts`, `server/api/dev/mail/[id].get.ts` — now source-switched; local path preserved.
- `sign-up.post.ts` caller: `app/pages/auth/register.vue` `submit()` — still receives `{ ok, message }`; new `emailDelivered` is additive.
- `/api/dev/mail` consumer: `app/pages/mail/index.vue` — `MailRecord` shape preserved.

## Definition of Done

- [ ] App builds; lint + typecheck pass on touched files (no new warnings).
- [ ] Duplicate signup still 409; fresh signup returns 200 even if email send fails (no orphan/no 409 trap).
- [ ] `EMAIL_TRANSPORT=smtp` sends via nodemailer; `local` in production throws a clear config error.
- [ ] `/mail` shows Mailtrap inbox when `MAILTRAP_*` + `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true` set; local fallback intact.
- [ ] New dependency justified in solution.md.
- [ ] `.env` + README + tasks index updated; changelog written.
