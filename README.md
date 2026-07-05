# JAPR — Journal of African Policy Review

Full-stack academic journal management system built with Nuxt 4, Drizzle ORM, PostgreSQL, and Better Auth.

The product specification lives in [`academic-journal-spec.md`](academic-journal-spec.md). The previous v1 implementation is archived at `japr-v1-reference`.

## Stack

- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **UI:** Nuxt UI 4 + Tailwind CSS 4
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Auth:** Better Auth (email/password, Google OAuth optional)
- **Email:** Resend (or local JSON capture in development)
- **State:** Pinia
- **Validation:** Zod (shared client/server schemas)

## Features

- Multi-role manuscript workflow (author → peer review → editorial decision → publication)
- Structured 6-criteria peer review (0–5 scale)
- Document upload, PDF conversion, and watermarked in-browser preview
- Manuscript version history with text diff comparison
- Regional reviewer assignment by expertise and geography
- In-app and email notifications
- Hierarchical category taxonomy (Category → SubCategory → SubSubCategory)
- Public journal catalogue with search, filters, likes, comments, and collections

## Commands

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build
pnpm preview
pnpm typecheck
pnpm lint
pnpm db:generate      # generate Drizzle migrations
pnpm db:migrate       # apply migrations
pnpm db:push          # push schema (dev only)
pnpm db:seed          # seed roles, categories, countries, default users
pnpm db:studio        # Drizzle Studio
```

## Environment

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS` — optional comma-separated extra origins (e.g. custom domain)
- `NUXT_PUBLIC_BASE_URL` — public site URL for password-reset and email links (defaults to `http://localhost:3000`)
- `EMAIL_TRANSPORT` — `local` (writes to `.data/mail/`, dev only), `smtp`, or `resend`
- `MAIL_FROM` — sender address (falls back to `RESEND_FROM`)
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` — required when `EMAIL_TRANSPORT=smtp` (e.g. Mailtrap)
- `RESEND_API_KEY` / `RESEND_FROM` — required when `EMAIL_TRANSPORT=resend`
- `MAILTRAP_API_TOKEN` / `MAILTRAP_ACCOUNT_ID` / `MAILTRAP_INBOX_ID` — optional; makes the `/mail` page read the Mailtrap sandbox inbox
- `STORAGE_DRIVER` — `local` (disk, dev/Docker) or `blob` (Vercel Blob); `BLOB_READ_WRITE_TOKEN` is auto-set by Vercel when a Blob store is connected
- `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `PANDOC_PATH`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional OAuth)
- `CRON_SECRET` — required in production; authenticates Vercel Cron's calls to `/api/cron/*` (Vercel sends it automatically as `Authorization: Bearer $CRON_SECRET`, see `vercel.json`)

## Vercel deployment

Set these in the Vercel project **Settings → Environment Variables** for Production (and Preview if you test branch deploys). Redeploy after saving.

| Variable | Example |
|---|---|
| `BETTER_AUTH_URL` | `https://japr.vercel.app` |
| `BETTER_AUTH_SECRET` | strong random secret (not your local dev value) |
| `NUXT_PUBLIC_BASE_URL` | `https://japr.vercel.app` |
| `DATABASE_URL` | hosted PostgreSQL connection string |
| `EMAIL_TRANSPORT` | `smtp` (or `resend`) — **never `local` on Vercel** (read-only filesystem) |
| `MAIL_FROM` | `JAPR <no-reply@your-domain>` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | required when `EMAIL_TRANSPORT=smtp` (Mailtrap: `live.smtp.mailtrap.io` to deliver, `sandbox.smtp.mailtrap.io` to capture) |
| `RESEND_API_KEY` / `RESEND_FROM` | required when `EMAIL_TRANSPORT=resend` |
| `MAILTRAP_API_TOKEN` / `MAILTRAP_ACCOUNT_ID` / `MAILTRAP_INBOX_ID` | optional — show the Mailtrap sandbox inbox on `/mail` (set with `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true`) |
| `STORAGE_DRIVER` | `blob` — store manuscript uploads in Vercel Blob (disk storage is not durable on Vercel) |
| `BLOB_READ_WRITE_TOKEN` | auto-added by Vercel when you connect a Blob store (Storage → Blob → Connect) |
| `NUXT_PUBLIC_DIRECT_UPLOAD` | `true` — upload manuscripts browser→Blob directly (required for files over ~4.5 MB) |
| `CRON_SECRET` | random string, 16+ characters — Vercel sends this as a Bearer token to `/api/cron/*`; without it the cron routes return 503 |

> The `/mail` viewer is public when `NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true` — it exposes activation codes and password-reset links to anyone with the URL. It's hard-blocked whenever `NODE_ENV=production` regardless of the flag, so it only ever works on local/dev/preview deployments.

> **Uploads on Vercel:** set `STORAGE_DRIVER=blob`, connect a Blob store, and set `NUXT_PUBLIC_DIRECT_UPLOAD=true` so the browser uploads straight to Blob (bypassing Vercel's ~4.5 MB serverless request-body limit). Do **not** enable `multipart` on the client — single PUT is enough for manuscript sizes. Redeploy after changing any of these. DOC/DOCX conversion and in-browser DOC preview are disabled on Vercel (no LibreOffice/Pandoc) — PDFs preview/download directly; DOC/DOCX are download-only.

`BETTER_AUTH_URL` must match the public site URL exactly (scheme + host, no trailing slash). On Vercel, `auth.ts` derives its base URL via Better Auth `allowedHosts`, currently scoped to `japr.vercel.app` only — preview deploys are not in the allow-list (add a team-scoped pattern there if you need them).

If Google OAuth is enabled, add `https://japr.vercel.app/api/auth/callback/google` to Google Cloud authorized redirect URIs.

## Docker

```bash
docker compose up --build
```

Runs PostgreSQL 16 and the app with Pandoc/LibreOffice for document conversion.

## Default seed users

| Role | Email | Password |
|------|-------|----------|
| admin | admin@example.com | password |
| editor_in_chief | editor@example.com | password |
| managing_editor | managing@example.com | password |
| author | author@example.com | password |
| associate_editor | associate@example.com | password |
| desk_editor | desk@example.com | password |
| external_reviewer | external@example.com | password |
| copy_desk_editor | copydesk@example.com | password |

## Project structure

```
app/           Vue pages, components, layouts, composables, stores
server/api/    Nitro REST endpoints
server/db/     Drizzle schema, migrations, seeds
server/middleware/  Auth guard, rate limiting
shared/        Zod validation + constants
auth.ts        Better Auth server config
```
