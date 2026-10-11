# Presentation readiness — manual test checklist

Mapped against Emmanuel's 2026-10-09 meeting notes, updated with the corrections made in this
session (2026-10-10/11). Status legend:

- ✅ **Ready** — built, test it to confirm, should work as described
- ⚠️ **Partial / caveat** — works, but with a limitation worth knowing before you demo it
- ❌ **Not built** — don't demo this; be upfront that it's planned, not done

---

## 1. Submission system

| Check | Status | How to test |
|---|---|---|
| Auto-submission link/flow creates a manuscript | ✅ | `/author/submit`, fill the form, submit, confirm it appears in the editor queue |
| PDF upload | ✅ | Upload a `.pdf` on submit |
| DOCX upload | ✅ | Upload a `.docx` on submit |
| **Legacy `.doc` upload is now rejected** | ⚠️ policy change | Try uploading an old `.doc` file — it should be refused with a clear message. **This is a deliberate change from Emmanuel's notes**, not a bug — see "Word→PDF conversion" below |
| DOCX preview renders | ✅ | Open a submitted `.docx` manuscript as an editor/reviewer, confirm the preview shows formatted content (not raw XML/garbage) |
| Reviewer comment system | ✅ | As a reviewer, submit a review with a comment; as the author, check it shows up on their submission's feedback view |
| Manuscript country is Africa-only; author's own country stays global | ✅ fixed 10-11 | Found during testing: both fields used the same unrestricted list. Confirm the manuscript's country dropdown on `/author/submit` only shows African countries; confirm your own profile country (settings/registration) still shows every country. A direct API call with a non-African country should also be rejected server-side |

**⚠️ "Word to PDF conversion should be standard" — this is explicitly NOT what was built.** After investigating, auto-converting DOCX→PDF in production would need either a new paid external service or a lower-fidelity pure-JS pipeline — both real cost/complexity trade-offs. The decision made this session was to standardize on `.docx` as the accepted format instead (with working in-browser preview), not to build PDF conversion. **Say this proactively to Emmanuel rather than letting him discover it** — it's a direction change from his ask, not a bug.

**⚠️ Known unresolved bug — don't demo on a flaky connection.** The submission form can freeze if the database connection hangs mid-submit, with no visible error and no safe retry (duplicate-submission risk if retried). Not fixed this session (deprioritized). If it happens live, don't repeatedly re-click submit.

---

## 2. Editorial workflow — three-person tier

| Check | Status | How to test |
|---|---|---|
| New submission notifies EIC + Managing Editor + Copy Desk Editor simultaneously | ✅ | Submit a manuscript, check notifications land for all three editor-tier accounts |
| "Desk Editor" (= Copy Desk Editor, per your correction) can assign reviewers as backup | ✅ | Log in as `copy_desk_editor`, open a pending manuscript, assign reviewers |
| Managing Editor is primary for assigning reviewers | ✅ | Already existing behavior |
| EIC oversees but doesn't personally assign reviewers | ✅ (matches notes) | EIC's permission set intentionally excludes `assign-reviewers` — confirmed this matches "EIC can request desk editor to send to reviewers," not do it directly |
| **Copy Desk Editor can create user accounts as admin backup** | ✅ | `copy_desk_editor` now holds `create-users`, `edit-users`, and `delete-users` permissions. The Users page (`/admin/users`) and its API endpoints are reachable from the Copy Desk Editor sidebar. Test: log in as `copy_desk_editor`, open Users from the sidebar, create a new user with a role and password. |
| Desk Editor / Copy Desk Editor can ping editors about pending work | ✅ | Use the Ping button on a manuscript page as `copy_desk_editor` |

---

## 3. Admin & user management

| Check | Status | How to test |
|---|---|---|
| Admin can create new users with roles + passwords | ✅ | Admin UI → create user, assign a role |
| Granular, admin-assignable/revocable permissions | ✅ | Admin UI → role permissions, toggle one, confirm it takes effect for that role |

**⚠️ Known, accepted risk — not fixed, your decision.** A handful of accounts (admin, author, associate editor, managing editor) still use a known weak password in production. Don't log into those specific accounts in front of Emmanuel, and don't forget this is still live until you clear/replace them.

---

## 4. Approval workflow

| Check | Status | How to test |
|---|---|---|
| **"Minimum 2 approvals / 2 rejections"** | ✅ fixed 10-11 — fully automatic | As soon as 2 of 3 reviewers agree (both accept or both reject), the manuscript is immediately approved/declined by the system — no editor click, no waiting for the 3rd reviewer. Test: 3 assigned reviewers, submit 2 matching reviews, confirm immediate resolution + notifications to author, reviewers, and editors. A split (or 2 matching revision recommendations) still waits for the 3rd reviewer, unchanged. |
| CopyDesk editor final publish step | ✅ | Push a manuscript through approval, confirm the copy-desk "mark published" action is available and works |
| Published articles don't show managing editor's name publicly | ✅ | View a published article as a logged-out/public visitor, confirm no ME name appears |

---

## 5. Academic profile fields

| Check | Status | How to test |
|---|---|---|
| Specialization ≤10 words | ✅ | Settings form, try typing 11+ words, confirm it's blocked/flagged |
| Academic degree is a single value, not a CV list | ✅ | Single text field by design |
| Publications ≤500 words | ✅ | Settings form, live word counter |
| Biography ≤500 words | ✅ | Settings form, live word counter |

---

## 6. Geographic/country filtering

| Check | Status | How to test |
|---|---|---|
| Country select shows regional groups (Africa sub-regions, Europe, Asia, N/S America, Australia & Oceania) | ✅ already existed | Open the country selector on submission or settings, confirm it's grouped by region, not a flat list |

---

## 7. "Ping" feature

| Check | Status | How to test |
|---|---|---|
| Ping button sends templated nudges to target roles | ✅ already existed | As an editor, open a manuscript, use Ping, pick a template, send it, confirm the recipient gets a notification |

---

## 8. Book Review Editor role

| Check | Status |
|---|---|
| Role exists, scoped to book-review manuscripts, listed in its own section of the editorial board | ❌ **not built at all** — no role, no permissions, no UI. A design exists only as a rough sketch (needs Emmanuel's input on scope/permissions and the person's name). If asked, be upfront this is planned, not done. |

---

## 9. Other known issues from the original notes

| Issue | Status |
|---|---|
| CopyDesk editor permission issues during testing | ✅ fixed (prior task, 2026-10-04) |
| Database connectivity problem / submission form freeze | ⚠️ not fixed this session |
| Country filter (Africa vs. other regions) | ✅ already fixed/existed |
| Book review editor integration | ❌ not built |
| Editor-in-chief account settings | ✅ checked — no reproducible bug found; you confirmed it looks fine now |

---

## Summary — what to say if asked

**Fully resolved and ready to demo:** three-person simultaneous notification, desk/copy-desk editor backup reviewer assignment, regional country grouping, ping, profile field limits, CopyDesk publish step, hidden ME name on published articles, DOCX submission + preview, Africa-only manuscript country, automatic 2-of-3 reviewer approval/rejection.

**Changed from the original ask (explain proactively):** DOCX is now the standard format instead of auto-converting to PDF. Approval is now fully automatic on 2-of-3 agreement — no editor click at all for that case, which is a bigger change than a simple vote-count tweak since it removes human confirmation; a genuine split still goes to the editor as before.

**Known gaps (be upfront, don't demo):** Book Review Editor role doesn't exist yet, the submission-freeze bug isn't fixed, a few accounts still have weak passwords.
