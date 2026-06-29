# Changelog — Vercel SMTP + Mailtrap viewer

## Layer 1 — High-level

JAPR can now send transactional email over generic SMTP (e.g. Mailtrap), so signup/activation/reset mail works on Vercel where the previous `local` file-capture transport crashed against the read-only filesystem. The `/mail` viewer can read a Mailtrap sandbox inbox via Mailtrap's Testing API, letting testers read activation codes on the deployed site (replacing the local `.data/mail` viewer that could never exist on Vercel). Signup is now atomic and tolerates email outages: a failed send no longer 500s after creating the user, which removes the "first attempt 500 → retry 409 Email already registered" trap originally reported. Affected flows: all outgoing mail, the `/mail` inbox + its two `/api/dev/mail*` endpoints, and the registration handler.

## Layer 2 — Low-level

- **`package.json`** — added `nodemailer` (dep) and `@types/nodemailer` (dev). Before: no SMTP client (only `resend`). Now: SMTP client available. Why: SMTP requires a client; nodemailer is the de-facto standard and the Resend SDK cannot do arbitrary SMTP.

- **`server/utils/email.ts`**
  - Imports: added `nodemailer` + `type Transporter`.
  - Module scope: added `isProduction`, `mailFrom` (`MAIL_FROM` ?? `resendFrom`), and a lazily-cached `smtpTransport` with `getSmtpTransport()` that builds a transporter from `SMTP_HOST/PORT/USER/PASS/SECURE` and throws if host/user/pass are missing. Before: only `resendApiKey`/`resendFrom`/`emailTransport`/`localMailDir`. Why: support the `smtp` transport without re-creating the transporter per call.
  - `sendEmail()` (was lines ~71-84): added an `smtp` branch (sends via nodemailer), switched the Resend `from` to `mailFrom`, and added a production guard that throws a clear error if `local` is selected in production. Before: only `resend`/`local`, `local` silently attempted a disk write and threw `EROFS` on Vercel. Now: `smtp` supported; `local`-in-prod fails fast with an actionable message. Why: this disk write was the root cause of the 500.

- **`server/utils/mailtrap.ts`** (new) — `isMailtrapViewerConfigured()`, `listMailtrapEmails()`, `getMailtrapEmail(id)`. Reads the Mailtrap Testing API (`MAILTRAP_API_TOKEN`/`MAILTRAP_ACCOUNT_ID`/`MAILTRAP_INBOX_ID`), maps messages to the existing `MailRecord` shape, bounds to the 30 most recent with parallel HTML/text body fetches, and throws 502 on API error. Why: gives the `/mail` UI a remote source on serverless.

- **`server/api/dev/mail.get.ts`** — now returns `listMailtrapEmails()` when Mailtrap is configured, else `listLocalEmails()`. Before: always local. Why: source-switch without changing the client.

- **`server/api/dev/mail/[id].get.ts`** — now uses `getMailtrapEmail(id)` when configured, else `getLocalEmail(id)`. Before: always local. Why: same source-switch for the detail route.

- **`server/api/auth/sign-up.post.ts`** — wrapped the `users`/`accounts`/`activations` inserts in a single `db.transaction`; moved email sending after commit into a try/catch that sets `emailDelivered`; response is now `{ ok, emailDelivered, message }`. Before: three sequential inserts then awaited emails with no error handling — an email throw left an orphaned user and 500'd the request, so retries hit the duplicate-email 409. Now: user creation is atomic and an email failure returns 200 with guidance to use "Resend code". Why: removes the orphan/409 trap and surfaces delivery failure instead of swallowing it.

- **`app/pages/mail/index.vue`** — intro copy now says mail comes from local capture or the Mailtrap sandbox inbox. Before: implied local only. Why: accuracy after the Mailtrap source was added. (`MailRecord` shape unchanged.)

- **`.env`** — switched `EMAIL_TRANSPORT` to `smtp`; added `MAIL_FROM`, `SMTP_HOST/PORT/USER/PASS/SECURE` (Mailtrap sandbox defaults, blank creds), and `MAILTRAP_API_TOKEN/ACCOUNT_ID/INBOX_ID` placeholders. Why: ready-to-fill local config.

- **`README.md`** — expanded the Environment list and the Vercel deployment table with the SMTP/Mailtrap/viewer vars, plus a security callout that the `/mail` viewer is public when enabled. Why: deploy guidance + risk disclosure.

- **`docs/tasks/README.md`** — added the `vercel-smtp-mailtrap` index row.

## Verification

- `pnpm typecheck` — pass.
- `pnpm exec eslint` on all changed server files — pass (no errors).
- `app/pages/mail/index.vue` has one pre-existing Tailwind warning (`max-h-[32rem]`) on an untouched line; left as-is.

## Untested paths

- Live SMTP send and live Mailtrap API fetch are not covered by automated tests (no credentials in CI); require a manual run with real Mailtrap creds. Recommended manual check: set `SMTP_*` + `MAILTRAP_*`, register a new user, confirm the activation mail appears at `/mail` and the code activates.
