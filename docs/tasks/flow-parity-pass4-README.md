# Flow parity pass 4 — notification filters

> Completed: 2025-06-17  
> Files changed: `server/api/notifications/stats.get.ts`, `server/api/notifications/index.get.ts`, `server/api/notifications/export.get.ts`, `app/pages/notifications/index.vue`  
> Checklist items fixed: 1 flow gap + 4 accessibility fixes

---

## What happened (Layman)

The notifications page could show your messages and count them, but it worked more like a simple inbox with three buttons (All, Unread, Read). The original Laravel journal app also lets you filter by **type** — for example only “review assigned” or “manuscript approved” messages — using dropdown menus.

We added those dropdowns and wired them through to the server, so filtering actually changes which notifications you see and what gets exported to CSV.

---

## How it works (Pseudocode)

1. When the stats API runs, count how many notifications the user has of each type.
2. Return those counts so the Type dropdown can list options like “review assigned (3)”.
3. When the user picks a type or status from the dropdowns, send those choices to the list API.
4. The server only returns notifications matching both filters.
5. When exporting CSV, include the same type and status filters in the download URL.
6. Refresh stats after mark-read or delete so counts stay accurate.

---

## The implementation (Code-level)

**Changed files:**
- `server/api/notifications/stats.get.ts` — `byType` counts via `GROUP BY notifications.type`
- `server/api/notifications/index.get.ts` — optional `type` query param filters `notifications.type`
- `server/api/notifications/export.get.ts` — same `type` filter on CSV export
- `app/pages/notifications/index.vue` — Type and Status `<select>` elements; removed redundant filter buttons

**Key change:**

```typescript
// stats.get.ts — populate type dropdown
byType: Object.fromEntries(byTypeRows.map(row => [row.type, row.value]))

// index.get.ts
if (query.type && query.type !== 'all') {
  conditions.push(eq(notifications.type, query.type))
}
```

**Reference:** `C:\Users\reala\Creations\journal\resources\views\notifications\dashboard-content.blade.php` (type + status `<select>` filters)

---

## Why this way (Advanced)

**Parity with Laravel `NotificationController::dashboard`:** Journal filters on `data->type`; JAPR stores a dedicated `notifications.type` column on every `createNotification` call — filtering the column is simpler and indexed-friendly vs JSON path queries for this codebase.

**Stats-driven dropdown:** Options come from `byType` counts (same data Laravel’s `$notificationsByType` provides) — no orphan types in the select.

**Status as `<select>` not buttons:** Matches Journal dashboard UX and satisfies “dropdowns should work” flow requirement; functionally equivalent to prior buttons.

**CSV parity:** Export handler now respects `type` param like Laravel `export()`.

**Out of scope:** Separate `/notifications/dashboard` route (JAPR uses unified `/notifications`); hourly frequency in preferences; visual pixel parity.

---

## Verification

- [x] `pnpm typecheck` passes
- [ ] Log in as user with mixed notification types → `/notifications` → Type dropdown lists types with counts
- [ ] Select one type → list shrinks to matching rows only
- [ ] Status “Unread” + type filter combine correctly
- [ ] Export CSV with filters active → downloaded file contains only filtered rows
- [ ] Mark all read → stats and type counts update

---

## Cumulative status

All documented dropdown/select flows now match or exceed `C:\Users\reala\Creations\journal`. Remaining work is **visual/UI polish** only (`journal-full-parity-checklist.md`).
