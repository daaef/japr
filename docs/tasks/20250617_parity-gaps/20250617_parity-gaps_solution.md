# Solution — Laravel parity P1 gaps

## Proposed approach
Port the five highest-impact functional gaps with minimal surface area: one download endpoint, enrich author dashboard from existing APIs, extend `/api/me` with `hasInterests`, add `notificationPreferences` JSON column + preferences page + CSV export, and link author submissions to existing version UI.

## Alternatives rejected
- **Separate `/dashboard` route alias** — unnecessary; keep `/author` and match Laravel content on that page.
- **Full notification dashboard with stats** — out of scope; preferences + export match Laravel routes used in production.

## Performance impact
Neutral — one extra count query on `/api/me`; dashboard uses existing list endpoints.

## Performance delta
Not measured; changes are single-query or static page enrichments.

## Trade-offs
- Notification preferences stored but not yet wired into email sender filtering (Laravel same — stored on user, partial enforcement).
- Download uses attachment disposition; preview endpoint unchanged.

## Dead code audit
None expected.
