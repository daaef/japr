# Icon migration map — Phosphor / inline SVG → `i-lucide-*`

Single source of truth for the Track-1 Nuxt UI migration (Phase 6). The legacy Phosphor icon
**font** is injected by `public/assets/js/phosphor-icon.js`, which is dropped when the dashboard
shells are rebuilt (W5) and the theme is deleted (W6). Every `<i class="ph ph-*">` and every
hand-pasted inline `<svg>` must therefore move to `<UIcon name="i-lucide-*">` **before** the
loader is removed, or icons vanish silently.

## Verification

Every target below was checked to exist in the installed set
(`node_modules/@iconify-json/lucide/icons.json`, prefix `lucide`, 1753 icons + aliases) — do not
add a mapping without re-checking membership. `@iconify-json/lucide` and `@iconify-json/simple-icons`
are the only icon collections installed (`package.json`).

## Phosphor → lucide (all verified present)

| Phosphor `ph-*` | `i-lucide-*` | Notes / where seen |
|---|---|---|
| `ph-x` | `i-lucide-x` | close buttons (layouts) |
| `ph-list` | `i-lucide-menu` | mobile hamburger (layouts) |
| `ph-squares-four` | `i-lucide-layout-grid` | dashboard nav |
| `ph-graduation-cap` | `i-lucide-graduation-cap` | |
| `ph-book-open` | `i-lucide-book-open` | |
| `ph-books` | `i-lucide-library` | admin "Journals" (no `books` in lucide) |
| `ph-bookmark-simple` | `i-lucide-bookmark` | |
| `ph-bell` | `i-lucide-bell` | notifications |
| `ph-gear` | `i-lucide-settings` | |
| `ph-sliders-horizontal` | `i-lucide-sliders-horizontal` | |
| `ph-target` | `i-lucide-target` | |
| `ph-magnifying-glass` | `i-lucide-search` | |
| `ph-check` | `i-lucide-check` | |
| `ph-check-circle` | `i-lucide-circle-check` | |
| `ph-x-circle` | `i-lucide-circle-x` | |
| `ph-warning-circle` | `i-lucide-circle-alert` | |
| `ph-warning` | `i-lucide-triangle-alert` | |
| `ph-clipboard-text` | `i-lucide-clipboard-list` | |
| `ph-shield-check` | `i-lucide-shield-check` | |
| `ph-shield` | `i-lucide-shield` | |
| `ph-users-three` | `i-lucide-users` | |
| `ph-user-check` | `i-lucide-user-check` | |
| `ph-envelope-simple` | `i-lucide-mail` | |
| `ph-eye` | `i-lucide-eye` | password reveal |
| `ph-eye-slash` | `i-lucide-eye-off` | password hide |
| `ph-upload-simple` | `i-lucide-upload` | |
| `ph-certificate` | `i-lucide-award` | approved/published KPIs |
| `ph-clock` | `i-lucide-clock` | |
| `ph-pencil-simple` | `i-lucide-pencil` | edit actions |
| `ph-trash` | `i-lucide-trash-2` | delete actions |
| `ph-list-checks` | `i-lucide-list-checks` | |
| `ph-calendar-check` | `i-lucide-calendar-check` | |
| `ph-file-text` | `i-lucide-file-text` | |
| `ph-file-x` | `i-lucide-file-x` | |

### `ph-fill` weight modifier

`ph-fill` is a Phosphor **weight** class (e.g. `class="ph-fill ph-book-open"` for the filled
glyph), not an icon. Lucide ships a single (outline) weight, so `ph-fill` is dropped — the mapped
outline glyph is the clean-default replacement. Seen in `DashboardStatCard.vue`,
`ReviewerAssignmentCards.vue`, `AdminHealthCard.vue`.

## Inline SVGs

~35 hand-pasted `<svg>` blocks across 8 files (`author/index.vue`, `JournalFiltersPanel.vue`,
`journal/JournalNavbar.vue`, `journal/JournalFooter.vue`, `pages/index.vue`, `mail/index.vue`,
`author/submissions/index.vue`, `author/submit.vue`). These are file-local and get mapped
in-flight during the workstream that touches each file: identify the SVG's intent, pick the
nearest lucide glyph, and **verify membership** (same JSON) before swapping. Common ones already
verified above (`search`, `eye`, `upload`, `x`, `menu`). No blanket table — each SVG is judged in
context.
