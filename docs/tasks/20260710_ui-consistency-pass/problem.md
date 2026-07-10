# Problem — UI consistency pass

Track 1 of the Nuxt UI unification (`docs/tasks/20260708_nuxt-ui-unification/`) finished migrating
every page off Bootstrap/jQuery/Preline onto Nuxt UI (commit `81ef0af`). Because that migration ran
page-by-page over many sessions and subagents, small stylistic choices — heading tags/weights,
top-level spacing scale, card usage vs. hand-rolled bordered `<div>`s, shared-component reuse — drifted
between files even though every file individually uses clean Nuxt UI + the brand palette.

This is **not** Track 2 (the full visual redesign, still gated behind separate sign-off, not
started) — no new colors, typography, or imagery. It's a smaller, distinct consistency pass: pick one
canonical pattern per dimension (already established somewhere in the codebase) and apply it
everywhere that dimension currently varies.

An audit agent surveyed representative pages across public/auth/all four dashboards and returned
~25 concrete findings across four dimensions: typographic hierarchy, spacing rhythm, card/visual-
hierarchy usage, and shared-component reuse. Two files reads while scoping the fix surfaced two more
findings not in the original audit: `app/pages/editorial/index.vue` was never migrated at all (still
raw Bootstrap-era markup with inert `swiper-slide` classes and a `font-manrope` class that doesn't
exist in the theme), and `EditorialBoardCard.vue` — a component already built for exactly this page's
data shape — has zero usages anywhere in the app.

See `plan.md` for the full list of standardization decisions and files touched.
