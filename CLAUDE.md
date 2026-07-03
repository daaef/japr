# Project guardrail — japr

Extends and does not replace the global prime directive (`~/.claude/CLAUDE.md`). That file's
precedence, NO ASSUMPTIONS rule, and self-audit ritual apply here unchanged.

## Stack

Nuxt 4 (Vue) + Nitro server routes, Drizzle ORM over Postgres, better-auth for
auth/session/OAuth, Vercel Blob for manuscript storage (pluggable `STORAGE_DRIVER`), Pinia,
Tailwind + Nuxt UI. Tests run via `tsx --test`.

## Security-sensitive paths — locked to `learn` mode by default

Work in these paths defaults to `mode: learn` regardless of the session's overall mode, unless
the developer explicitly says `mode: ship` for that specific change:

- `server/api/auth/**`, `auth.ts`, `server/middleware/auth.ts`, `server/middleware/rate-limit.ts`
  — authentication, session, activation, rate-limiting
- `server/db/schema/roles.ts`, anything assigning/checking `userRoles` or role-gated access
- `server/api/reviewer/**`, `server/api/manuscripts/**`, review-policy and visibility checks
  (reviewer identity, confidential comments, manuscript ownership)
- Upload/storage paths: `server/api/**upload**`, `server/utils/storage/**`, Blob token/callback
  routes
- Anything touching PII (`users`, `activations`, notification email content)

An explicit `mode: ship` for a specific task (e.g. implementing an already-reviewed
`docs/tasks/*/plan.md` + `solution.md` pair) overrides this default for that task only — it does
not change the default for the next unrelated change in these paths.

## Task docs

`docs/tasks/<date>_<slug>/` holds `problem.md` / `plan.md` / `solution.md` written and reviewed
before code lands, plus a `changelog.md` once it does. See `docs/tasks/README.md` for the index
and current roadmap sequencing.
