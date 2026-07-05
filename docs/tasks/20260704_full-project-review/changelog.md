# Changelog — full-project-review remediation

> Note: this file currently only tracks Phase 3, because it was branched from `main` before
> Phase 1's changelog (on the unmerged `fix/manuscript-storage-privacy` branch) and Phase 2's
> changelog (on the unmerged `fix/review-flow-guards-2` branch) landed there. When all three
> branches merge, this file will need its versions combined by hand — a one-file textual merge,
> not a code conflict.

## Phase 3 — Server hardening (B2, B5, B6, B9, B10, B11, B12, B15, B16) — landed 2026-07-05

Branch: `fix/server-hardening-2` (off `main`, independent of Phases 1–2's unmerged branches).
Gate: `pnpm lint` (0 errors, 6 pre-existing warnings) · `pnpm typecheck` clean · `pnpm test` 40/40
pass (5 new tests: `tests/email.test.ts`, `tests/reviewerStatusEnum.test.ts`).

### Two decisions confirmed with the human before implementing (per the doc's 🛑 markers)

- **B11** (`auth.ts` `allowedHosts`): dropped preview-deploy support entirely rather than guess a
  Vercel team/org slug for a scoped wildcard — `allowedHosts` is now `['japr.vercel.app']` only.
  Preview deploys will fail Better Auth host validation until someone adds a real scoped pattern.
- **B12** (mail viewer): the reviewer's suggested fix ("require an admin session or shared
  secret") would have broken the documented, intentional design in `devMail.ts` — new registrants
  read their own activation email with no session at all, before they can log in. Implemented the
  recommended alternative instead: hard-block the viewer whenever the deployment is really
  production, regardless of the flag.

### What landed

- **B2** — `server/api/files/preview.post.ts`: joins `basename(fileField.filename)` instead of
  the raw client-supplied filename into the per-request temp dir, closing the `..\..\` path
  traversal.
- **B5** — `server/api/users/[id].get.ts` now excludes `passwordHash` via the relational query's
  `columns: { passwordHash: false }`. `users/[id].patch.ts` destructures it out of the response
  (the `.returning()` row still goes to `logAdminAction` unredacted, which is fine — its
  `sanitizeAuditValues` already redacts `passwordHash` before the audit row is stored; verified
  in `server/utils/adminAuditCore.ts`).
- **B6** — `server/middleware/rate-limit.ts`: two changes, not one.
  1. **Bucket eviction**: a lazy sweep (checked once per request, actually runs at most every 5
     minutes) deletes expired `(ip, path)` buckets so a long-lived instance doesn't accumulate one
     entry forever. No `setInterval` — timers are a poor fit for serverless instances that can be
     frozen/recycled at any time.
  2. **IP keying — deviated from the doc's literal suggestion.** The doc proposed switching to
     h3's `getRequestIP(event, { xForwardedFor: true })`. Read h3 1.15.6's source directly
     (`node_modules/.pnpm/h3@1.15.6/.../dist/index.mjs`): that helper takes the **first**
     `x-forwarded-for` entry — byte-for-byte the same spoofable logic the old code already had.
     Swapping to it would have been a no-op dressed up as a fix. The actual fix: trust the
     **last** entry instead, since Vercel's edge is the sole reverse proxy in front of this app
     and appends (doesn't replace) the real client IP as the final hop — standard
     trust-N-proxies-deep X-Forwarded-For semantics. Implemented as `getTrustedClientIp()`.
- **B9** — `server/api/contact.post.ts` now escapes `fullName`, `email`, `phone`, and `message`
  with the newly-exported `escapeHtml` from `server/utils/email.ts` before interpolating into the
  notification email's HTML body (subject line left unescaped — it's plain text, not HTML, and
  escaping it would show literal `&amp;` etc. in the recipient's inbox). Confirmed the contact
  form is meant to be public by reading `app/pages/contact.vue` directly: `layout: 'public'`, no
  `auth` middleware, standard public contact-page semantics — added `/api/contact` to
  `server/middleware/auth.ts`'s exempt list and a `{ max: 5, windowMs: 60_000 }` entry in
  `rate-limit.ts`.
- **B10** — `server/api/journals/[id]/comments/index.post.ts` now runs the exact same visibility
  gate the GET endpoint uses (`findJournalByParam` + `resolveJournalViewerRole` +
  `isPubliclyVisibleJournal`) before inserting a comment, closing the hole where any authenticated
  user could comment on a draft or blind-review manuscript they have no relationship to.
- **B11** — see decision above.
- **B12** — see decision above. `assertMailViewerAccess` now also checks
  `VERCEL_ENV === 'production'` when `VERCEL_ENV` is set, falling back to
  `NODE_ENV === 'production'` off Vercel. **Caught in self-review before finalizing:** my first
  pass checked `NODE_ENV === 'production'` unconditionally — but Vercel sets `NODE_ENV=production`
  for *both* production and preview builds; only `VERCEL_ENV` tells them apart. The first version
  would have silently killed the demo behavior on preview deploys too, which is exactly what the
  human asked to preserve. Corrected before running the gate.
- **B15** — `server/api/editor/journals/[uuid]/approve.post.ts:43` now compares against
  `REVIEWER_STATUS.REVIEWED` instead of `MANUSCRIPT_STATUS.REVIEWED` (grepped the rest of `server/`
  for the same mistake — no other instances). `server/db/schema/reviewers.ts`'s `status` column is
  now a real `pgEnum` (`reviewer_status`: pending/in-progress/declined/reviewed) instead of free
  `text`. Migration `0013_tearful_matthew_murdock.sql` does `CREATE TYPE` then
  `ALTER COLUMN ... USING` in one file — safe because it's a brand-new type, not `ALTER TYPE ADD
  VALUE` on an existing one (the transaction trap from an earlier task). Queried the local dev DB
  before migrating: the only value present was `'reviewed'`, so the `USING` cast was safe.
  Grepped every `reviewers.status` write site in `server/` first — all use `REVIEWER_STATUS.*`
  constants already, no stray literals that would violate the new constraint.
- **B16** — both `server/api/admin/audit/export.get.ts` and `server/api/notifications/export.get.ts`
  now prefix any CSV field starting with `=`, `+`, `-`, or `@` with a leading `'` before the
  existing quote-escaping, closing the spreadsheet formula-injection vector. Patched both
  duplicated `escapeCsvField` functions identically rather than extracting a shared util — that
  dedup is B14's job, not B16's.
- **Tests** — `tests/email.test.ts` (4 tests) covers `escapeHtml` directly (script tags, attribute
  breakout via `">`, ampersands/quotes, plain text passthrough).
  `tests/reviewerStatusEnum.test.ts` asserts `reviewerStatusEnum.enumValues` matches
  `REVIEWER_STATUSES` from `shared/constants/reviewerStatus.ts`, guarding the "must stay in sync"
  comment left in the schema file against future drift.

### Not verified

- B2, B6, B9's session-exemption, B10, and B12 are route/middleware logic exercised only by
  typecheck — no live-DB integration test or browser smoke test of an actual traversal attempt,
  spoofed header, anonymous contact submission, cross-viewer comment attempt, or a real
  production-vs-preview `VERCEL_ENV` value.
- B6's "last hop is trustworthy" reasoning follows standard X-Forwarded-For proxy-chain semantics
  and Vercel's documented single-edge-hop topology, but wasn't verified against a live Vercel
  deployment's actual header value from this environment.
- B15's migration was applied to the local dev DB only; not run against any deployed environment.
