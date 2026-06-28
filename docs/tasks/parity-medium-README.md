# Notification dropdown + submit taxonomy cascade

> Completed: 2025-06-17  
> Files changed: dropdown.get.ts, NotificationDropdown.vue, 3 layouts, useNotifications.ts, notifications store, submit.vue  
> Checklist items fixed: 3 (+ unread count bug)

---

## What happened (Layman)

The editor, reviewer, and admin dashboards now have a proper notification bell like the original Laravel app — a red badge when something is unread, a quick preview of the latest messages, and buttons to mark them read. Authors submitting a paper can now pick a sub-category (and optional sub-subcategory) after choosing the main category, the same way the old site loaded dependent dropdowns.

---

## How it works (Pseudocode)

1. Bell component asks the server for unread count on load and via SSE/polling.
2. When the user opens the bell, fetch the five newest notifications.
3. Clicking an item marks it read and optionally navigates to its link.
4. “Mark all read” clears unread state.
5. On submit form, when category changes, clear sub-category picks.
6. Show sub-category list filtered from the nested categories API response.
7. When sub-category changes, refresh sub-subcategory list.
8. Require sub-category when the category has children.

---

## The implementation (Code-level)

**Dropdown API:** `GET /api/notifications/dropdown` — limit 5, formatted for UI.

**Submit cascade:** Uses nested `subCategories` / `subSubCategories` from existing `GET /api/categories` — no new endpoint.

**Bug fix:** API returns `{ unreadCount }` but clients read `.count` — aligned clients to `unreadCount`.

---

## Verification

- [ ] `pnpm typecheck` passes
- [ ] Log in as editor → bell shows badge when unread notifications exist
- [ ] Open dropdown → see up to 5 items; Mark All Read works
- [ ] `/author/submit` → pick category → sub-category select appears
- [ ] Submit with category + sub-category succeeds
