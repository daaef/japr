# Flow Parity Pass 6 — Queues, Invitations, Copy Desk

> Completed: 2025-06-17  
> Files changed: `server/api/reviewer/journals/approved.get.ts`, `server/api/reviewer/journals/rejected.get.ts`, `server/api/reviewer/journals/accept.post.ts`, `server/api/reviewer/journals/decline.post.ts`, `app/pages/reviewer/journals/[uuid]/review.vue`, `server/api/notifications/dropdown.get.ts`, `server/api/doc-preview/[uuid].get.ts`, `server/api/doc-preview/[uuid]/file.get.ts`, `server/services/versions.ts`, `app/pages/editor/journals/[uuid].vue`, `server/api/editor/journals/[uuid]/approve-for-publication.post.ts`, `app/middleware/auth.ts`, `shared/validation/reviews.ts`  
> Checklist items fixed: 7

---

## What happened (Layman)

Several reviewer and copy-desk workflows were broken even though the pages existed. Approved and declined reviewer queues showed empty tables because the list component and API disagreed on the data shape. Reviewers could not accept invitations from inside the app without an email link. Copy desk editors could open manuscripts but not preview them. Notification dropdown links for review invitations did not work. This pass aligned those flows with the Laravel Journal app.

---

## How it works (Pseudocode)

1. Reviewer approved/declined APIs return the same `reviews` array shape as pending/in-progress queues.
2. Accept and decline POST endpoints accept either an email token or the journal id for the logged-in reviewer.
3. Review page shows accept/decline buttons whenever the assignment is still pending.
4. Doc preview and version access treat copy desk editors like other editorial staff for read access.
5. Editor journal detail hides assign/approve/notice controls from copy desk-only users.
6. Notification dropdown maps `acceptUrl` from notification payload to clickable links.
7. Author interests no longer require review policy acceptance first.
8. Approve-for-publication sets `approvalStatus` and validates reviewed status plus minimum review count.

---

## The implementation (Code-level)

**Key change — reviewer queue API shape:**
```ts
// Before
return { journals: approved }

// After
return { reviews: [{ id, journalId, journalTitle, status, assignedAt }] }
```

**Key change — in-app invitation response:**
```ts
// review.vue — no token required from pending queue
body: invitationToken.value
  ? { token: invitationToken.value }
  : { journalId: uuid.value }
```

---

## Why this way (Advanced)

**Contract consistency:** `ReviewerQueueList.vue` is shared across pending, in-progress, reviewed, approved, and declined pages. Normalizing API responses to `{ reviews }` avoids component forks and matches the join query pattern already used in `pending.get.ts`.

**Dual identifier for invitations:** Email links use opaque tokens; in-app navigation uses journal UUID. The accept/decline handlers resolve either, preserving security (user id must match assignment) without forcing token propagation through every queue link.

**Copy desk read vs write split:** Copy desk needs manuscript preview for editing workflows but must not invoke `requireEditor()` POST endpoints. UI gating (`canEditManuscript`) plus `isEditorialProfileRole` on read paths implements least-privilege without a separate copy-desk detail page.

---

## Verification

- [x] `pnpm typecheck` passes
- [x] `pnpm run build` passes (from prior pass)
- [ ] Reviewer → Approved queue shows manuscripts where journal status is approved
- [ ] Reviewer → Pending → Open → Accept works without `?token=` in URL
- [ ] Copy desk editor opens journal detail → document preview loads
- [ ] Copy desk editor does not see Assign reviewers / Editorial actions panels
- [ ] Notification dropdown review invitation link opens accept URL

## Remaining (out of this pass)

- Admin category/subcategory edit/delete UI (APIs partially exist; Laravel has full CRUD)
