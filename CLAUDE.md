# Project guardrail — japr

Working method comes from `~/.claude/CLAUDE.md` (standing orders S1–S6 are mandatory here).
This file holds project facts only.

## Audience — standing rule for everything users see

The users are academics (professors, editors, reviewers, authors), not tech people. This covers
the WHOLE site: public pages and every dashboard (author, reviewer, editor, copy desk, and
admin, including audit logs and settings). Admins are academics too. Every piece of text
shown (labels, buttons, tables, empty states, errors, emails, help text) must read
naturally to them:
- Use the language of academic publishing: manuscript, submission, reviewer, decision,
  revision, editorial board. Never developer terms: API, endpoint, payload, ID/UUID, slug,
  status code, null, cache, token, sentinel.
- Never show raw values: `IN_PROGRESS` → "In progress", `copy_desk_editor` → "Copy desk editor".
- Errors say what happened and what to do next ("We couldn't save your revision. Please try
  again, or contact the editorial office."), never a stack trace or "500".
- Before adding or changing user-facing text, read it as a professor who has never used
  the site would.

## Stack

Nuxt 4 (Vue) + Nitro server routes, Drizzle ORM over Postgres, better-auth for
auth/session/OAuth, Vercel Blob for manuscript storage (pluggable `STORAGE_DRIVER`), Pinia,
Tailwind + Nuxt UI. Tests run via `tsx --test`.

## Security-sensitive paths — standing order S6 applies

Changes here need the risk named as a question and the developer's confirmation of the fix
before it counts as done:

- `server/api/auth/**`, `auth.ts`, `server/middleware/auth.ts`, `server/middleware/rate-limit.ts`
  — authentication, session, activation, rate-limiting
- `server/db/schema/roles.ts`, anything assigning/checking `userRoles` or role-gated access
- `server/api/reviewer/**`, `server/api/manuscripts/**`, review-policy and visibility checks
  (reviewer identity, confidential comments, manuscript ownership)
- Upload/storage paths: `server/api/**upload**`, `server/utils/storage/**`, Blob token/callback
  routes
- Anything touching PII (`users`, `activations`, notification email content)

## Task docs

`docs/tasks/<date>_<slug>/` holds `problem.md` / `plan.md` / `solution.md` written and reviewed
before code lands, plus a `changelog.md` once it does. See `docs/tasks/README.md` for the index
and current roadmap sequencing.
