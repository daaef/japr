# Flow Parity Pass 7 — Admin Taxonomy CRUD

> Completed: 2026-06-17  
> Files changed: `shared/validation/categories.ts`, `server/api/categories/index.get.ts`, `server/api/subcategories/[id].patch.ts` (new), `server/api/subcategories/[id].delete.ts` (new), `server/api/sub-subcategories/[id].patch.ts` (new), `server/api/sub-subcategories/[id].delete.ts` (new), `app/pages/admin/categories.vue`  
> Checklist items fixed: 1 (final functional parity gap)

---

## What happened (Layman)

The admin area could only **create** categories, sub-categories, and sub-subcategories — it could not rename, disable, or delete them, unlike the original Journal app which had full management. This pass adds the ability to edit names, toggle a category on/off, and delete sub-categories and sub-subcategories directly from the admin "Category tree", closing the last functional difference with the reference app.

---

## How it works (Pseudocode)

1. When an admin opens the categories page, fetch the full tree including disabled categories (`includeInactive=1`).
2. For each category, show an Edit button (rename + description + status) and a Disable/Enable button.
3. For each sub-category, show Edit (rename) and Delete buttons.
4. For each sub-subcategory, show small edit and delete icons.
5. On Save, send a PATCH to the matching API; on Delete, confirm then send a DELETE.
6. After any change, refresh the tree so the UI reflects the new state.
7. The list endpoint only returns disabled categories when the caller is an admin; everyone else still gets active-only.

---

## The implementation (Code-level)

**New APIs (admin-gated, mirror existing category PATCH/DELETE pattern):**
- `server/api/subcategories/[id].patch.ts` — rename (re-slugifies), optional re-parent
- `server/api/subcategories/[id].delete.ts` — hard delete (children cascade)
- `server/api/sub-subcategories/[id].patch.ts` — rename
- `server/api/sub-subcategories/[id].delete.ts` — hard delete

**List endpoint:**
```ts
// server/api/categories/index.get.ts — admin-only inactive visibility
if (includeInactive) {
  const context = await getCurrentUserContext(event)
  if (!context.roles.includes('admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden.' })
  }
}
// ...
where: includeInactive ? undefined : (table, { eq }) => eq(table.isActive, true)
```

**Validation (`shared/validation/categories.ts`):** added `subCategoryUpdateSchema` and `subSubCategoryUpdateSchema` (optional `name`, optional parent id).

**UI (`app/pages/admin/categories.vue`):** inline edit drafts (`editingCategoryId` / `editingSubId` / `editingSubSubId` with reactive draft objects), Save/Cancel, status toggle, and confirm-guarded deletes.

---

## Why this way (Advanced)

- **Soft-delete for categories, hard-delete for sub/sub-sub.** Categories are referenced by journals (`onDelete: 'set null'`), but disabling rather than deleting preserves historical attribution and matches prior JAPR decisions (the `isActive` toggle from pass 3). Sub-categories and sub-subcategories also `set null` on journals, so a hard delete is safe and matches Laravel's `repo->delete($id)` semantics exactly.
- **Single list endpoint with a guarded flag** (DRY) instead of a duplicate admin endpoint — public callers (`/author/submit`, interests, search facets) are unaffected because they never pass `includeInactive`.
- **One-row-at-a-time inline editing** keeps page state minimal (three id refs + three draft objects) rather than a per-row component explosion, while remaining keyboard- and screen-reader-labeled.
- **Cascade trust:** the DB `onDelete: 'cascade'` on `sub_sub_categories.sub_category_id` means the UI confirm ("and all its sub-subcategories") is honored at the schema level — no manual child cleanup needed.

---

## Verification

- [x] `pnpm typecheck` passes
- [x] `pnpm run build` passes
- [x] No linter errors on changed files
- [x] Re-audit vs `Creations\journal`: no remaining functional flow bugs
- [ ] As admin, open `/admin/categories` → Edit a category name and toggle Disable → tree shows "Disabled" badge; re-enable restores it
- [ ] Rename and delete a sub-category → confirm prompt; sub-subcategories removed with it
- [ ] Rename and delete a sub-subcategory inline
- [ ] As non-admin, `GET /api/categories?includeInactive=1` returns 403; `GET /api/categories` still returns active-only
