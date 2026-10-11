# Problem: no safe way to bootstrap the first admin account

## Background

Investigating the production credential-exposure incident (seeded `admin@example.com` /
`password` accounts — see the live-DB cleanup done 2026-10-10) surfaced that this project has
no production-safe way to create the *first* admin account at all:

- `server/db/seeds/system.ts`'s `defaultUsers` loop (lines 21-29) hardcodes a dev admin with a
  known plaintext password, with no production guard.
- Its `DEFAULT_ADMIN_EMAIL`/`DEFAULT_ADMIN_PASSWORD` mechanism (lines 307-350) is silently
  ineffective whenever it targets the same email as the hardcoded dev admin, because the
  hardcoded loop runs first and the second block only acts `if (!admin)`.
- The only other way to create a user with the `admin` role is `server/api/users/index.post.ts`,
  which itself requires an existing admin session (`requireAdmin`) — a chicken-and-egg problem on
  a genuinely fresh install.

## Scope

Design a one-time "first-run setup" flow: when zero users hold the `admin` role, the app shows a
setup screen to create the first admin account instead of normal login/register. Once that admin
exists, the setup screen is permanently inaccessible — there is no second use of this path.

This is a planning document only. `server/api/auth/**` and `auth.ts` are locked to `learn` mode
by default per this repo's `CLAUDE.md` — implementation needs its own explicit `mode: ship`
decision when the developer is ready to build it, same as every other change in this session.
