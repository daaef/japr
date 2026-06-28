# Flow parity sync with Creations/journal

> Completed: 2025-06-17  
> Files changed: `shared/validation/journals.ts`, `server/api/journals/search.get.ts`, `app/pages/journals/index.vue`, `app/pages/admin/users.vue`, `app/pages/admin/users/[id].vue`, `app/pages/author/interests.vue`  
> Checklist items fixed: 3 flow gaps + 1 accessibility fix

---

## What happened (Layman)

When you picked categories on the homepage and searched for journals, the website threw away the finer filters (sub-category and sub-sub-category) before asking the database — like ordering a coffee with “oat milk, extra shot” but the barista only hears “coffee.” License filters on the catalogue page had the same problem: the checkboxes worked in the browser but the server ignored them.

Admin user forms let you type any country name by hand, while registration and author forms used a proper country dropdown fed from the database — inconsistent and error-prone.

On the interests page you could hit Save with nothing selected and get a confusing server error.

We aligned JAPR with the Laravel journal app (`C:\Users\reala\Creations\journal`) so those flows actually work.

---

## How it works (Pseudocode)

1. When the browser calls journal search, accept `subcategory`, `subsubcategory`, and `license` in the query string (single or multiple values).
2. Validate those parameters with the same rules as other search filters.
3. If subcategory IDs are present, only return journals whose `sub_category_id` matches.
4. If sub-subcategory IDs are present, filter on `sub_sub_category_id`.
5. If license labels are present, match journals whose stored license JSON text contains each label (e.g. “CC BY” matches `{ "type": "CC BY 4.0" }`).
6. On the `/journals` page, read subcategory params from the URL (from homepage search) and pass them through to the search API.
7. Replace admin country text inputs with the shared `CountrySelect` component.
8. On interests save, block the action when zero categories are selected and show a clear message.

---

## The implementation (Code-level)

**Changed files:**
- `shared/validation/journals.ts` — added `subcategory` and `subsubcategory` to `journalQuerySchema` (reuses `queryStringArray` preprocessor for single-or-array query params)
- `server/api/journals/search.get.ts` — `inArray` filters for sub IDs; `license::text ILIKE` for JSON license matching (parity with `EloquentJournalRepository::searchJournal`)
- `app/pages/journals/index.vue` — forwards `subcategory` / `subsubcategory` from route query to API and `buildQuery`
- `app/pages/admin/users.vue` / `[id].vue` — `CountrySelect` with `variant="dashboard"`
- `app/pages/author/interests.vue` — client guard + disabled save button + `role="alert"` on error

**Key change (search handler):**

```typescript
// server/api/journals/search.get.ts
if (query.subcategory?.length) {
  conditions.push(inArray(journals.subCategoryId, query.subcategory))
}
if (query.subsubcategory?.length) {
  conditions.push(inArray(journals.subSubCategoryId, query.subsubcategory))
}
if (query.license?.length) {
  const licenseMatches = query.license.map(label =>
    sql`${journals.license}::text ILIKE ${`%${label}%`}`
  )
  conditions.push(or(...licenseMatches)!)
}
```

**Reference (Laravel):** `C:\Users\reala\Creations\journal\app\Repositories\Journal\EloquentJournalRepository.php` lines 335–358

---

## Why this way (Advanced)

**SRP / MES:** Each gap had a single root cause (schema/handler omission, wrong input control, missing client guard). No new abstractions — extended existing `journalQuerySchema` and reused `CountrySelect`.

**JAPR vs Laravel on subcategory:** Laravel only filters `subcategory` when it arrives as an array; homepage sends a single string. JAPR’s `queryStringArray` normalises a single UUID to a one-element array, so homepage → catalogue search works correctly (slightly ahead of Laravel).

**License JSON:** Both apps store `license` as JSON. Laravel’s `whereIn('license', $request->license)` only works when stored values exactly match checkbox submissions (checkboxes in Blade lack `value` attributes — fragile). JAPR uses `ILIKE` on serialised JSON so filter labels like “CC BY” match seed data `{ type: 'CC BY 4.0' }`.

**CountrySelect:** One component, one API (`GET /api/countries`), same country name strings as register/submit — avoids admin typos and drift from seeded geography.

**Out of scope (UI task):** Catalogue sidebar still uses flat category checkboxes (Journal’s `/journals` page is also flat); admin subcategory create UI; notification dashboard type `<select>` filters; visual parity checklist.

---

## Verification

- [x] `pnpm typecheck` passes with no new errors
- [ ] Homepage: select category + sub-category + sub-sub-category → Search → `/journals` URL contains `subcategory` and `subsubcategory` params → result count narrows vs unfiltered
- [ ] `/journals`: check a license filter → Apply → network tab shows `license` query param → results change for seeded `CC BY 4.0` journals
- [ ] Admin → Create user: country field is grouped dropdown (not free text)
- [ ] Author interests: Save disabled with zero selections; message if forced save attempted

---

## Remaining flow items (not blocking core parity)

| Item | Notes |
|------|-------|
| Admin subcategory/sub-subcategory UI | APIs exist; Journal admin forms are also incomplete |
| `/journals` sidebar 3-level tree | Journal catalogue uses flat categories; homepage has tree |
| Contact phone country | Hardcoded in both apps |
| Email `frequency` batching | Not implemented in either app |

See `docs/FLOW_VERIFICATION_REPORT.md` for full matrix.
