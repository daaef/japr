# Problem — notification dropdown + submit taxonomy

## Root cause
Laravel dashboard headers use a rich notification bell dropdown; JAPR only links to `/notifications`. Submit form lacks subcategory cascade though `/api/categories` returns nested taxonomy and journal POST accepts subcategory IDs.

## Symptoms
- No unread badge or quick notification preview in editor/reviewer/admin headers
- `useNotifications` reads `count` but API returns `unreadCount` (badge always zero)
- Author submit only picks top-level category

## Affected files
`server/api/notifications/dropdown.get.ts`, `app/components/dashboard/NotificationDropdown.vue`, `app/layouts/{admin,editor,reviewer}.vue`, `app/composables/useNotifications.ts`, `app/stores/notifications.ts`, `app/pages/author/submit.vue`
