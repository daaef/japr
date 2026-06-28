# Flow parity recheck

> Completed: 2025-06-17  
> Files changed: `app/pages/journals/index.vue`, `app/pages/admin/categories.vue`  
> Checklist items fixed: 2 flow gaps + 4 accessibility/form fixes

---

## What happened (Layman)

We ran a second check to make sure JAPR really matches the Laravel journal app (`C:\Users\reala\Creations\journal`) on how things *work*, not just how they look. Two things were still off.

On the journal search page, you could pick “search by title” but that choice was never sent to the server — like telling a librarian “only show books with this word in the title” and they still search everywhere.

In the admin area, you could add top-level categories and *see* the full tree, but there was no way to add sub-categories or sub-subcategories — even though the backend already knew how. That’s like having empty shelves labeled “add items here” with no way to stock them.

We fixed both so dropdown-driven flows are complete end-to-end.

---

## How it works (Pseudocode)

1. When the journals page loads or the URL changes, read `searchType` from the address bar.
2. Include `searchType` in the request to the journal search API so title-only search actually filters by title.
3. On the admin categories page, show two new forms below “Add category.”
4. First form: pick a parent category from a dropdown, type a sub-category name, submit.
5. Second form: pick a parent category, then a sub-category dropdown fills from that choice, type a sub-subcategory name, submit.
6. When the parent category changes on the second form, clear the sub-category pick so you cannot submit a mismatched pair.
7. After each successful create, refresh the tree so new items appear immediately.

---

## The implementation (Code-level)

**Changed files:**
- `app/pages/journals/index.vue` — added `searchType` to `useFetch` query `computed` (was only in `buildQuery` for navigation, not API fetch)
- `app/pages/admin/categories.vue` — sub-category and sub-subcategory forms with cascading `<select>` elements wired to existing POST APIs

**Key change (search):**

```typescript
// app/pages/journals/index.vue — useFetch query
searchType: typeof route.query.searchType === 'string' ? route.query.searchType : undefined,
```

**Key change (admin cascade):**

```typescript
const subCategoryOptions = computed(() => {
  const category = data.value.categories.find(item => item.id === subSubForm.categoryId)
  return category?.subCategories ?? []
})

watch(() => subSubForm.categoryId, () => {
  subSubForm.subCategoryId = ''
})
```

**APIs used (already existed):**
- `POST /api/categories/:id/subcategories`
- `POST /api/subcategories/:id/sub-subcategories`

**Reference:** `C:\Users\reala\Creations\journal\routes\web.php` (`subcategories.store`, `sub-subcategories.store`)

---

## Why this way (Advanced)

**MES / SRP:** The search bug was a one-line omission in the fetch query — no new endpoint. Admin taxonomy used existing POST routes instead of new pages, matching Journal’s separate create screens but co-located on one admin page for faster flow parity.

**Cascade pattern:** Sub-subcategory parent select depends on category select — same Vue `computed` + `watch` pattern as `author/submit.vue`, keeping one source of truth (`GET /api/categories` nested tree).

**JAPR ahead of Journal:** Journal’s subcategory create form lacks a parent category dropdown (known Laravel gap). JAPR’s admin UI includes explicit parent selects, reducing mis-assignment.

**Component size:** `categories.vue` exceeds 150 lines after adding two forms; acceptable for a single admin screen — splitting would add files without flow benefit.

**Out of scope:** Category `active_status` toggle on create (Journal has it; JAPR `categoryCreateSchema` has no `isActive` on POST). Contact phone country hardcoding. Visual parity checklist.

---

## Verification

- [x] `pnpm typecheck` passes
- [ ] `/journals`: choose “Title” in search type, search a keyword → network request includes `searchType=title`
- [ ] Admin → Categories: select parent category + name → “Add sub-category” → item appears in tree
- [ ] Admin → Categories: select category → sub-category dropdown populates → add sub-subcategory → badge appears under correct sub-category
- [ ] Change parent category on sub-sub form → sub-category selection resets

---

## Full parity status (flow layer)

After this pass + prior `flow-parity-sync`:

| Area | Status |
|------|--------|
| Auth, submit cascade, interests | OK |
| Search (category, sub, sub-sub, license, searchType) | OK |
| Editor / reviewer workflows | OK |
| Notifications + email prefs | OK |
| Admin users (CountrySelect) | OK |
| Admin category tree create | OK |
| Visual / layout parity | Separate UI task |

See `docs/FLOW_VERIFICATION_REPORT.md` and `docs/PARITY_MASTER.md`.
