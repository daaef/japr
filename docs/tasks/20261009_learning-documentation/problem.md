# Problem: No onboarding path from "can read code, shaky writing it" to confident contributor

## Symptoms

1. **JS fundamentals are shaky, not absent.** The developer can read existing Vue/Nuxt code and
   make small edits, but closures, promises/async-await, destructuring, and other core JS idioms
   used throughout this codebase are not yet solid enough to write new logic confidently from
   scratch.

2. **No codebase map exists for someone still building fluency.** Existing docs
   (`docs/tasks/*`, `docs/PARITY_MASTER.md`, etc.) record feature decisions for readers who
   already understand the stack — they don't teach the stack itself.

3. **No single "what to learn next" list.** When a new JS or Vue concept is needed, the developer
   doesn't always know which concept to look up ("sometimes I just need to know what to learn,
   that's all"). There's no ordered bridge from "this is unfamiliar" to "read this, in this
   order."

4. **External resources are disconnected from the real code.** MDN and vuejs.org are useful but
   generic — they don't point back to where that exact pattern is actually used in *this*
   codebase, so the concept and its real application stay mentally separate.

## What the developer wants

A new documentation tree, under version control, that:

- Maps the **whole codebase** (`app/` + `server/` + `shared/`) at overview depth right now, so
  there's a complete mental model immediately — depth gets added to specific areas later as
  they're actually worked on.
- Prioritizes **JavaScript fundamentals first**, then **Vue/Nuxt patterns**, then **HTML/CSS
  last** (explicitly lowest priority — baseline HTML/CSS is closer to adequate already).
- For every concept, shows a **real, cited example from this exact codebase** (`file:line`) next
  to a link to an authoritative external resource (MDN for JS, vuejs.org/nuxt.com for Vue/Nuxt)
  — never a generic example disconnected from the code.
- Includes **one ordered roadmap/checklist** as the entry point for "I just need to know what to
  look up."
- **Cross-links heavily**: a structural doc (e.g. "what's in `app/composables/`") points into the
  relevant concept docs instead of re-explaining them, and concept docs point back to every
  structural doc that uses that concept — the docs form one connected graph, not isolated files.
- **Stays current**: updated in the same change as any future edit to a documented area, matching
  this project's own `CLAUDE.md` discipline for directory-scoped instruction files.
- Lives in git/GitHub for permanent record-keeping, but has **zero footprint on the Vercel
  production build/deploy**.

## Current infrastructure / constraints to build on

- `docs/tasks/<date>_<slug>/` is this project's existing convention for `problem.md`/`plan.md`/
  `solution.md` — but that convention documents *feature work*, not teaching material. The new
  tree (`docs/learning/`) is deliberately separate from it.
- No `.vercelignore` exists yet. `docs/` already sits in git today without being read by any
  runtime code — verified via `grep -rn "docs/" app server nuxt.config.ts`, which only turns up
  comments referencing `docs/tasks/` paths, never a file read. Excluding `docs/learning/` from the
  Vercel deployment bundle is therefore a plain `.vercelignore` entry; no app code changes needed.
- **Discrepancy found during investigation:** the project's own `CLAUDE.md` describes the stack as
  including "Pinia" — but a full repo check (`package.json` dependencies, `grep -rn
  "pinia|defineStore" app/ shared/`, presence of an `app/stores/` folder) found **zero** Pinia
  usage anywhere. State is actually managed via Nuxt's built-in `useState`/`useAsyncData`. This
  plan documents the real pattern, not the stale `CLAUDE.md` line (see `plan.md` Open Questions
  for whether to also correct `CLAUDE.md` itself).

## Scope

Produce `docs/tasks/20261009_learning-documentation/plan.md` specifying, file by file, the exact
content of a new `docs/learning/` tree plus a `.vercelignore` entry — then, once approved,
implement it.
