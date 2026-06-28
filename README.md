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
pnpm dev              # http://localhost:4000
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
- `RESEND_API_KEY` / `RESEND_FROM` (or `EMAIL_TRANSPORT=local`)
- `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `PANDOC_PATH`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional OAuth)

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
