# Layer 1

Dashboard headers now match Laravel’s notification bell: unread badge, latest five items, mark-all-read, and link to full list. Author manuscript submit cascades category → sub-category → optional sub-subcategory using data already returned by `/api/categories`. Fixed unread-count field mismatch so badges populate correctly.

# Layer 2

| File | Change |
|------|--------|
| `server/api/notifications/dropdown.get.ts` | New: latest 5 notifications + unread count for header dropdown |
| `app/components/dashboard/NotificationDropdown.vue` | New Bootstrap-styled dropdown component |
| `app/layouts/editor.vue`, `reviewer.vue`, `admin.vue` | Replaced static bell link with `NotificationDropdown` |
| `app/composables/useNotifications.ts` | Fixed `unreadCount` API field (was `count`) |
| `app/stores/notifications.ts` | Same unread count fix |
| `app/pages/author/submit.vue` | Sub-category cascade, validation, POST fields |
