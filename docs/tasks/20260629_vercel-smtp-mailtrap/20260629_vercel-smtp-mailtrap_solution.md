# Solution — Generic SMTP transport + Mailtrap-backed mail viewer

## Proposed approach

1. **Add an `smtp` transport** to `server/utils/email.ts` using `nodemailer`, configured from `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE` and a `MAIL_FROM` sender. Transporter is lazily created and cached at module scope. Keeps `resend` and `local` untouched.
2. **Fail fast on misconfig**: if `EMAIL_TRANSPORT=local` is selected while `NODE_ENV=production`, throw a clear error (read-only FS) instead of a generic 500 mid-request.
3. **Mailtrap mail viewer**: new `server/utils/mailtrap.ts` reads the Mailtrap **Testing API** (`MAILTRAP_API_TOKEN` + `MAILTRAP_ACCOUNT_ID` + `MAILTRAP_INBOX_ID`) and maps messages to the existing `MailRecord` shape. `/api/dev/mail` and `/api/dev/mail/[id]` use Mailtrap when configured, else fall back to local files. The `/mail` UI is unchanged.
4. **Harden signup** (`sign-up.post.ts`): wrap user+account+activation inserts in a single `db.transaction`; send mail after commit inside try/catch; return `ok: true` with an `emailDelivered` flag + message so an email failure neither orphans the user nor dead-ends retries on 409.
5. **Config/docs**: add the new env vars to `.env`, `README.md` (incl. Vercel table), and document Mailtrap sandbox vs live + the viewer's exposure risk.

## Alternatives rejected

- **Resend SDK only** — needs a verified domain immediately; user wants Mailtrap/SMTP. Generic SMTP also covers Resend-SMTP, Postmark, Gmail later.
- **Write mail to `/tmp` on Vercel** — `/tmp` is per-invocation and wiped; not shared, never delivered. Useless for activation.
- **Proxy Mailtrap via SMTP read** — SMTP can't read an inbox; the Testing REST API is the supported read path.

## Performance impact

Neutral for sending (one SMTP call replacing one file write/Resend call). Mailtrap viewer does N+1 body fetches, bounded to the 30 most recent messages, parallelised — dev/test-only endpoint.

## Performance delta

Not measurable in a meaningful baseline; no app rendering, DB query, or socket hot path changes. Signup adds one transaction wrapper around three inserts that already ran (net neutral; gains atomicity).

## Trade-offs

- New dependency `nodemailer` (+ `@types/nodemailer`). Justified: SMTP requires an SMTP client; nodemailer is the de-facto standard and the Resend SDK cannot do arbitrary SMTP.
- Returning `ok` when email failed trades "loud 500" for "account created, use Resend code" — surfaced via `emailDelivered`/message, not swallowed.
- Mailtrap viewer needs an API token (separate from SMTP creds).

## Dead code audit

None removed. `local`/`resend` transports and `listLocalEmails`/`getLocalEmail` remain as the non-Mailtrap fallback for local dev.
