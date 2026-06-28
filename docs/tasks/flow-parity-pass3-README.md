# Flow parity pass 3

> Completed: 2025-06-17  
> Files changed: `app/pages/author/interests.vue`, `server/api/author/interests.post.ts`, `app/pages/auth/register.vue`, `app/pages/admin/categories.vue`, `shared/validation/categories.ts`, `server/api/categories/index.post.ts`, `app/pages/contact.vue`  
> Checklist items fixed: 3 flow gaps + 6 accessibility fixes

---

## What happened (Layman)

We ran a third check against the Laravel journal app (`C:\Users\reala\Creations\journal`) to catch anything still out of sync on how forms and dropdowns behave.

Three things were still off. Authors could pick more than five research interests, but the original site caps you at five. New accounts could skip typing an institution even though registration requires one. Admins could add categories but not choose whether they should be active (turned on or off) like the Laravel admin screen allows.

We fixed those and tightened the contact form so screen readers can follow every field label.

---

## How it works (Pseudocode)

1. When an author checks an interest, count how many are selected.
2. If they try to select a sixth, undo that check and show a warning.
3. On the server, reject interest saves with more than five category IDs.
4. On registration, mark the institution field as required in the browser before submit.
5. On admin category create, show an Enable/Disable dropdown and send that value to the API.
6. Store `isActive` on the new category row from the admin’s choice.
7. On the contact form, link every label to its input with matching IDs.

---

## The implementation (Code-level)

**Changed files:**
- `app/pages/author/interests.vue` — `watch(selectedIds)` reverts when length > 5; copy mentions five max
- `server/api/author/interests.post.ts` — `categoryIds` Zod `.max(5)`
- `app/pages/auth/register.vue` — `required` on institution input (matches `RegistrationController` `institution => required`)
- `shared/validation/categories.ts` — `isActive` on `categoryCreateSchema`
- `server/api/categories/index.post.ts` — persists `body.isActive`
- `app/pages/admin/categories.vue` — Enable/Disable `<select>` on create form
- `app/pages/contact.vue` — `htmlFor`/`id` pairs, `role="alert"` on errors

**Key change (interests cap):**

```typescript
// server/api/author/interests.post.ts
categoryIds: z.array(z.string().uuid()).min(1).max(5)
```

```typescript
// app/pages/author/interests.vue
watch(selectedIds, (ids, previous) => {
  if (ids.length > 5) {
    selectedIds.value = previous ?? ids.slice(0, 5)
    errorMessage.value = 'You can select up to 5 interests.'
  }
})
```

**Reference:** `C:\Users\reala\Creations\journal\resources\views\interests.blade.php` (`maxSelections = 5`)

---

## Why this way (Advanced)

**Defence in depth:** Client `watch` gives immediate feedback (matches Laravel toastr UX); server `.max(5)` prevents API bypass — standard form validation layering.

**MES on category status:** Extended existing `categoryCreateSchema` rather than a separate PATCH — one round-trip on create, mirrors Journal’s `active_status` select on `categories/create.blade.php`.

**Contact phone select:** Journal uses hardcoded US/CA/EU; JAPR keeps US/CA/NG/ZA/GB (African journal focus). No `/api/countries` wiring for phone codes — different semantic (ISO dial prefix vs country name). Parity is functional, not identical option list.

**Vue `watch` on array:** Using `previous` snapshot avoids fighting `v-model` checkbox array updates; simpler than per-checkbox `@change` handlers.

**Out of scope:** Visual parity checklist, notification dashboard type filters, audit admin screens, manual E2E smoke.

---

## Verification

- [x] `pnpm typecheck` passes
- [ ] Author interests: select 5 categories OK; 6th shows error and does not stick
- [ ] POST `/api/author/interests` with 6 UUIDs returns validation error
- [ ] Register: empty institution blocked by browser `required`
- [ ] Admin categories: create with “Disable” → new category has `isActive: false` in DB
- [ ] Contact form: tab through fields — labels focus correct inputs

---

## Cumulative flow parity status

After passes `flow-parity-sync`, `flow-parity-recheck`, and this pass:

| Flow area | Status |
|-----------|--------|
| Search filters + searchType | OK |
| Submit / admin taxonomy cascades | OK |
| Interests (min 1, max 5) | OK |
| Register institution required | OK |
| Admin category active status | OK |
| Notifications + email prefs | OK |
| Visual / layout | Separate UI task |

See `docs/FLOW_VERIFICATION_REPORT.md`.
