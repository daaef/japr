# Changelog — Reviewer-assignment state guards

## Layer 1 — High-level

The reviewer assignment's own status (`pending`/`in-progress`/`declined`/`reviewed`) now has guarded transitions, mirroring the manuscript state machine's already-proven pattern. A reviewer can no longer submit a review before accepting, resubmit after already submitting, or decline after already completing a review. `request-change` now requires the caller to actually be assigned to the manuscript and the manuscript to be in a non-terminal state — previously any authenticated reviewer-role user could force any manuscript into revision, including published or declined ones. `assign-reviewers` now rejects assigning a manuscript's own author as its reviewer.

## Layer 2 — Low-level

- **`shared/constants/reviewerStatus.ts`** (new) — `REVIEWER_STATUS`, `isReviewerStatus`, `ALLOWED_REVIEWER_TRANSITIONS`, `canTransitionReviewerStatus`, mirroring `manuscriptStatus.ts`'s pattern exactly. Pure/isomorphic, no server-only imports.
- **`server/utils/journalWorkflow.ts`** — added `assertReviewerStatus` (server-only throwing guard, alongside the existing `assertManuscriptStatus`); replaced the `MANUSCRIPT_STATUS.REVIEWED`/`.DECLINED` string-literal comparisons in `reviewerResponseIsTerminal`/`getCompletedReviewCount` with the new `REVIEWER_STATUS` constants (same string values, now semantically correct — this was comparing reviewer status against the *manuscript* status enum purely because the literals happened to coincide).
- **`server/api/reviewer/journals/submit-review.post.ts`** — requires `status === 'in-progress'` before accepting a submission; sets status to `REVIEWER_STATUS.REVIEWED`. No self-service resubmission once reviewed (an editor-approved reopen would be a separate, explicit action, out of scope here).
- **`server/api/reviewer/journals/decline-with-comment.post.ts`** — rejects if `status === 'reviewed'` (via `assertReviewerStatus` against the allowed set pending/in-progress/declined).
- **`server/api/reviewer/journals/request-change.post.ts`** — added the missing caller-assignment check (403 if the caller has no `reviewers` row for that journal) and copied `request-revisions.post.ts`'s exact `assertManuscriptStatus` allowed-list (in-progress, under_peer_review, ready_for_managing_editor_notice, reviewed).
- **`server/api/editor/journals/[uuid]/assign-reviewers.post.ts`** — rejects the whole request with 400 if any target id equals `journal.userId`.
- **Cross-file consistency (DoD requirement):** replaced every remaining raw string-literal read/write of `reviewers.status` with the new `REVIEWER_STATUS` constants across `accept.get.ts`, `accept.post.ts`, `decline.get.ts`, `decline.post.ts`, `declined-invitations.get.ts`, `in-progress.get.ts`, `pending.get.ts`, `reviewed.get.ts` — behavior unchanged, same string values, now traceable to one source of truth.
- **`tests/reviewerStatus.test.ts`** (new) — unit coverage for the transition table and status guard, mirroring `manuscriptStatus.test.ts`.

## Alternatives considered / deviations from plan

- Plan step 1 asked for "a shared `assertReviewerStatus` / `ALLOWED_REVIEWER_TRANSITIONS` helper." Implemented both, in the same split the manuscript state machine already uses: the pure enum/transition-table lives in `shared/constants/reviewerStatus.ts` (importable from tests), the throwing `assertReviewerStatus` lives in `server/utils/journalWorkflow.ts` alongside `assertManuscriptStatus` (needs `createError`, a Nitro-only global). Not a plan deviation, just following the codebase's existing, already-established split for the exact same reason (see Phase 2's changelog for the `h3`-under-`tsx-test` constraint this avoids).
- `accept.post.ts`/`accept.get.ts`/`decline.post.ts`/`decline.get.ts` did **not** get new transition guards (only the constant swap) — they weren't named in the plan's affected files, and the constraint explicitly protects the "editor re-invites a declined reviewer" flow; adding an unrequested guard there risked breaking it without being asked.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (35/35) — all pass.
- Live against `nuxt dev` + the docker-compose Postgres, using two seeded reviewer rows on one manuscript (temporarily walked through `pending` → `in-progress` → `reviewed`, and the manuscript through `approved_with_comment` → `under_peer_review` → `changes_requested` → `under_peer_review`, all restored to original values afterward):
  - `submit-review` on a `reviewed` row → 409, exact message includes current status.
  - `submit-review` on a `pending` row → 409.
  - `submit-review` on an `in-progress` row → 200, status becomes `reviewed`.
  - Immediately resubmitting the same review → 409 (no resubmission).
  - `decline-with-comment` on a `reviewed` row → 409.
  - `request-change` by a reviewer with no assignment on that manuscript → 403.
  - `request-change` by the assigned reviewer while the manuscript is `approved_with_comment` (terminal-ish, not in the allowed list) → 400.
  - Same reviewer, manuscript flipped to `under_peer_review` → 200, manuscript moved to `changes_requested`.
  - `assign-reviewers` targeting the manuscript's own author → 400, specific message.
  - `assign-reviewers` targeting a legitimate different reviewer (re-invite path) → 200, unaffected.

## Known side effect of live verification

One seeded reviewer row's `review`/`comment`/`rating`/`criteriaRatings` content was overwritten by an actual `submit-review` call made during testing (status and journal approval status were restored to original values, but that row's free-text review content now reflects the test payload rather than the original seed text). This is local dev/seed data only, not a code or production concern, and doesn't affect the correctness of the guards verified above.

## Untested paths

None beyond the plan's own note — all guard logic is deterministic and was exercised above against seeded data in every relevant status.
