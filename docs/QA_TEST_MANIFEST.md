# JAPR QA Test Manifest — Complete Live Test Session

**Purpose:** End-to-end manual QA for every user type and every manuscript lifecycle path, run against the live deployment.

**Date prepared:** 2026-09-25

---

## Pre-requisites

You need the following test accounts (register them ahead of time or have the admin create them):

| Account alias | Role(s) to assign | Purpose |
|---|---|---|
| `AUTHOR-1` | author | Primary author who submits manuscripts |
| `AUTHOR-2` | author | Second author (tests visibility isolation) |
| `EIC` | editor_in_chief | Approve, reject, publish, request revisions |
| `ME` | managing_editor | Assign reviewers, send approval/decline notices, request revisions |
| `REVIEWER-A` | associate_editor **or** external_reviewer | Reviewer who accepts and reviews |
| `REVIEWER-B` | external_reviewer | Reviewer who declines |
| `REVIEWER-C` | external_reviewer | Third reviewer (quorum = 3) |
| `ADMIN` | admin | Full admin access |
| `COPY-DESK` | copy_desk_editor | Final publication step |
| `DESK-EDITOR` | desk_editor | Desk-level review coordination |

> **CRITICAL — Editor-in-Chief vs Managing Editor:**
> These two roles have **completely disjoint permissions**. They are NOT interchangeable. The system is designed as a two-person editorial handshake:
>
> | Action | Editor-in-Chief (`EIC`) | Managing Editor (`ME`) |
> |---|---|---|
> | Send to review (`journal:approve`) | YES | NO |
> | Desk decline (`journal:reject`) | YES | NO |
> | Assign reviewers (`reviewer:assign`) | NO | YES |
> | Send approval notice (`journal:send_approval_notice`) | NO | YES |
> | Send decline notice (`journal:send_decline_notice`) | NO | YES |
> | Approve manuscript directly (`journal:approve`) | YES | NO |
> | Reject manuscript directly (`journal:reject`) | YES | NO |
> | Approve for publication / publish (`journal:publish`) | YES | NO |
> | Request revisions (`journal:request_revisions`) | YES | YES |
>
> You **must** test with separate accounts for each role to verify the permission split.

> **Tip:** At minimum you need: 1 admin, 1 author, 1 EIC, 1 ME, and 3 reviewer accounts (for the quorum-of-3 tests). A single admin account has all permissions and can be used as a fallback, but it won't verify the permission boundaries.

---

## Complete Role-Permission Reference

Use this as a quick-reference while testing. Each column is a permission; each row is a role.

| Permission | admin | editor_in_chief | managing_editor | associate_editor | external_reviewer | author | desk_editor | copy_desk_editor |
|---|---|---|---|---|---|---|---|---|
| Create users | X | | | | | | | |
| Edit users | X | | | | | | | |
| Delete/suspend users | X | | | | | | | |
| Submit manuscript | X | | | | | X | | |
| Edit own manuscript | X | | | | | X | | |
| Upload revision | X | | | | | X | | |
| **Assign reviewers** | X | | **X** | | | | | |
| Manage reviews | X | | | X | | | X | |
| **Request revisions** | X | **X** | **X** | X | | | | |
| Coordinate reviews | X | | | X | | | X | |
| Submit review | X | | | X | X | | X | |
| Provide feedback | X | | | X | X | | X | |
| **Send approval notice** | X | | **X** | | | | | |
| **Send decline notice** | X | | **X** | | | | | |
| **Approve manuscript** | X | **X** | | | | | | |
| **Reject manuscript** | X | **X** | | | | | | |
| **Publish manuscript** | X | **X** | | | | | | |
| Copy edit | X | | | | | | | X |
| Final edit | X | | | | | | | X |
| Prepare for publication | X | | | | | | | X |

> **Key takeaway:** Editor-in-Chief and Managing Editor have **zero permission overlap** except `request_revisions`. Every other editorial action belongs to exactly one of them. The admin has everything.

---

## How to run the tests

1. **Work flow by flow, in order.** Each flow section below is self-contained. Complete Flow A before starting Flow B — some flows depend on manuscripts created in earlier flows.
2. **Use a fresh browser or incognito window** per account to avoid session cross-contamination. Or log out / log in between account switches.
3. **Check each box** as you complete a step. If a step fails, note the actual behavior next to the step.
4. **Keep the browser console open** (F12 > Console tab) throughout — note any JavaScript errors or failed network requests (red lines in the Network tab).
5. **Check email** (or the dev mail viewer at `/admin/dev-mail` if configured) after every step marked with a mail icon.

---

## FLOW A: Registration, Activation, and Authentication

### A1. New Account Registration (happy path)
- [ ] Navigate to the site root (`/`)
- [ ] Click "Register" / navigate to `/auth/register`
- [ ] Fill in all required fields: Full Name, Username, Email, Password, Country, Institution
- [ ] Submit the form
- [ ] **Verify:** Success message appears mentioning activation email
- [ ] **Verify:** Registration confirmation email is received
- [ ] **Verify:** Activation code email is received with a 6-digit code

### A2. Account Activation (happy path)
- [ ] Navigate to `/auth/activate`
- [ ] Enter the email and the correct activation code
- [ ] Submit
- [ ] **Verify:** Success — redirected to `/auth/success-activation`
- [ ] **Verify:** Welcome email is received

### A3. Account Activation — Edge Cases
- [ ] Enter a **wrong code** — verify error "Invalid activation code"
- [ ] Enter the wrong code **5 times** — verify lockout message "Too many incorrect attempts. Request a new one."
- [ ] Wait for code to **expire** (if feasible) and try again — verify "This activation code has expired. Request a new one."

### A4. Resend Activation Code
- [ ] Navigate to `/auth/activate`
- [ ] Use the "Resend code" option
- [ ] **Verify:** New activation email arrives with a fresh code
- [ ] Activate using the new code — verify success

### A5. Login (happy path)
- [ ] Navigate to `/auth/login`
- [ ] Enter correct email and password
- [ ] Submit
- [ ] **Verify:** Redirected to the appropriate dashboard based on role

### A6. Login — Edge Cases
- [ ] Enter a **wrong password** — verify error message
- [ ] Enter a **non-existent email** — verify error message
- [ ] Try logging in as a **non-activated account** — verify what happens (should succeed but account may show as inactive)

### A7. Forgot Password Flow
- [ ] Navigate to `/auth/forgot-password`
- [ ] Enter a registered email
- [ ] Submit
- [ ] **Verify:** Redirected to `/auth/success-reset-request`
- [ ] **Verify:** Password reset email received with a link
- [ ] Click the link — redirected to `/auth/reset-password`
- [ ] Enter a new password and confirm
- [ ] Submit
- [ ] **Verify:** Redirected to `/auth/success-reset`
- [ ] Log in with the **new** password — verify success
- [ ] Try logging in with the **old** password — verify it fails

### A8. Guest Middleware
- [ ] While logged in, navigate to `/auth/login` — **verify:** redirected away (guest-only page)
- [ ] While logged out, navigate to `/author` — **verify:** redirected to `/auth/login?redirect=/author`

---

## FLOW B: Author Onboarding and Manuscript Submission

> **Login as:** `AUTHOR-1`

### B1. Author Interests Onboarding (first-time gate)
- [ ] Navigate to `/author/submit`
- [ ] **Verify:** Redirected to `/author/interests` (no interests set yet)
- [ ] Select 1-5 research interest categories
- [ ] Save interests
- [ ] **Verify:** Success message, redirected to `/author`
- [ ] Navigate to `/author/submit` again — **verify:** no redirect this time

### B2. Author Interests — Edge Cases
- [ ] Try saving with **0 categories** selected — verify error "Select at least one category"
- [ ] Try selecting **more than 5** categories — verify limit message
- [ ] Update existing interests (change selection) — verify update succeeds

### B3. Review Policy Acceptance Gate
- [ ] Navigate to `/author/submissions` (without having accepted review policy)
- [ ] **Verify:** Redirected to `/review-policy`
- [ ] Read and accept the review policy
- [ ] **Verify:** Redirected back / can now access submissions

### B4. Manuscript Submission (happy path)
- [ ] Navigate to `/author/submit`
- [ ] Fill in all required fields:
  - Title
  - Author name
  - Abstract
  - Description / content
  - Country
  - Language
  - Category (and subcategory / sub-subcategory if available)
- [ ] Upload a manuscript file (PDF, DOC, or DOCX, under 10MB)
- [ ] Accept terms (agree checkbox)
- [ ] If review policy not yet accepted, accept it in the modal
- [ ] Submit
- [ ] **Verify:** Success — manuscript created
- [ ] **Verify:** Manuscript appears in `/author/submissions` with status "Desk Review"
- [ ] **Verify:** Author receives a "Submission received" confirmation email
- [ ] **Verify:** (Login as EIC and ME) Both editor roles receive a "New manuscript submitted" notification + email

### B5. Manuscript Submission — Edge Cases
- [ ] Submit with **missing required fields** — verify validation errors for each
- [ ] Upload a file that is **not PDF/DOC/DOCX** (e.g., .txt, .jpg) — verify "Only PDF, DOC, and DOCX files are allowed"
- [ ] Upload a file **over 10MB** — verify "File exceeds the 10MB limit"
- [ ] Submit **without uploading a file** — verify the behavior (should be allowed; journalUrl is optional)
- [ ] Submit with very **long title** (>255 chars) — verify validation
- [ ] Submit with **minimum-length** fields — verify acceptance

### B6. Author Dashboard
- [ ] Navigate to `/author`
- [ ] **Verify:** Dashboard shows summary stats (submission count, etc.)
- [ ] Navigate to `/author/submissions`
- [ ] **Verify:** List of author's own manuscripts is visible with correct statuses

### B7. Author Submission Detail View
- [ ] Click on a submitted manuscript from `/author/submissions`
- [ ] Navigate to `/author/submissions/[id]`
- [ ] **Verify:** Title, abstract, description, status, dates are all correct
- [ ] **Verify:** Version history is visible (v1.0)

---

## FLOW C: Editor Desk Review Phase (Editor-in-Chief)

> **Login as:** `EIC` (editor_in_chief)
> The send-to-review and desk-decline actions require `journal:approve` and `journal:reject` — permissions held by the Editor-in-Chief, **not** the Managing Editor.

### C1. EIC Dashboard
- [ ] Navigate to `/editor`
- [ ] **Verify:** Dashboard shows summary statistics (pending count, in-progress, etc.)
- [ ] Navigate to `/editor/submissions`
- [ ] **Verify:** New submission from AUTHOR-1 appears in the desk review list

### C2. EIC Views Manuscript Detail
- [ ] Navigate to `/editor/journals/[uuid]` for the submitted manuscript
- [ ] **Verify:** Full manuscript details visible: title, abstract, description, author, category, country, language, format
- [ ] **Verify:** File download works (if file was uploaded)
- [ ] **Verify:** Version history is visible
- [ ] **Verify:** Reviewer section is visible (empty at this point)
- [ ] **Verify:** The "Send to Review" and "Desk Decline" buttons are visible (EIC has these permissions)
- [ ] **Verify:** The "Assign Reviewers" button is NOT visible (EIC lacks `reviewer:assign`)
- [ ] **Verify:** The "Send Approval Notice" and "Send Decline Notice" buttons are NOT visible (EIC lacks these)

### C3. Desk Review — Send to Review (happy path)
- [ ] On the manuscript detail page, click "Send to Review"
- [ ] **Verify:** Status changes from "Desk Review" to "In Progress"
- [ ] **Verify:** Author receives a notification that their manuscript status changed
- [ ] **Verify:** Manuscript moves to the `/editor/in-progress` list

### C4. Desk Review — Desk Decline
- [ ] (Submit a **new** manuscript as AUTHOR-1 for this test)
- [ ] As EIC, navigate to the new manuscript detail
- [ ] Click "Desk Decline"
- [ ] Enter a reason (minimum 5 characters)
- [ ] Submit
- [ ] **Verify:** Status changes to "Declined"
- [ ] **Verify:** Author receives decline notification + email with the reason
- [ ] **Verify:** Manuscript appears in `/editor/declined`

### C5. Desk Decline — Edge Cases
- [ ] Try desk-declining with a **reason shorter than 5 characters** — verify validation error
- [ ] Try desk-declining a manuscript that is **not in Desk Review / Pending** status — verify error "Manuscript must be desk_review or pending before desk rejecting"

### C6. Managing Editor CANNOT Desk-Review
> **Login as:** `ME` (managing_editor)
- [ ] Navigate to the same manuscript detail page
- [ ] **Verify:** The "Send to Review" button is NOT visible (ME lacks `journal:approve`)
- [ ] **Verify:** The "Desk Decline" button is NOT visible (ME lacks `journal:reject`)
- [ ] **Verify:** The "Assign Reviewers" button IS visible (ME has `reviewer:assign` — but can't use it yet because the manuscript hasn't been sent to review)

---

## FLOW D: Reviewer Assignment (Managing Editor)

> **Login as:** `ME` (managing_editor)
> Assigning reviewers requires `reviewer:assign` — a permission held by the Managing Editor, **not** the Editor-in-Chief.

### D1. Assign Reviewers (happy path)
- [ ] Navigate to the "In Progress" manuscript from Flow C3
- [ ] **Verify:** The "Assign Reviewers" button is visible
- [ ] Click "Assign Reviewers"
- [ ] **Verify:** Regional assignment suggestions are visible (matching by country, interests)
- [ ] Select REVIEWER-A, REVIEWER-B, and REVIEWER-C
- [ ] Submit assignment
- [ ] **Verify:** Success — 3 reviewers assigned
- [ ] **Verify:** Each reviewer receives an invitation email with accept/decline links
- [ ] **Verify:** Each reviewer receives an in-app notification

### D2. EIC CANNOT Assign Reviewers
> **Login as:** `EIC` (editor_in_chief)
- [ ] Navigate to the same "In Progress" manuscript
- [ ] **Verify:** The "Assign Reviewers" button is NOT visible (EIC lacks `reviewer:assign`)

### D3. Assign Reviewers — Edge Cases
- [ ] (As ME) Try assigning a reviewer who is **already assigned** to this manuscript — verify handling (should be idempotent or error)
- [ ] Try assigning reviewers to a manuscript in **"Declined"** status — verify error
- [ ] Try assigning reviewers to a manuscript in **"Approved"** status — verify error

---

## FLOW E: Reviewer Invitation Response

### E1. Reviewer Accepts Invitation (happy path)
> **Login as:** `REVIEWER-A`
- [ ] Check email for the review invitation
- [ ] Click the "Accept" link in the email
- [ ] **Verify:** Redirected to `/reviewer/invitations/respond` with action=accept
- [ ] If review policy not yet accepted, accept it first at `/review-policy`
- [ ] Confirm acceptance
- [ ] **Verify:** Redirected to `/reviewer/in-progress`
- [ ] **Verify:** The manuscript appears in the reviewer's in-progress list
- [ ] **Verify:** (Login as EIC and ME) Both editor roles receive notification "Reviewer accepted"

### E2. Reviewer Declines Invitation (simple)
> **Login as:** `REVIEWER-B`
- [ ] Click the "Decline" link in the email
- [ ] **Verify:** Redirected to `/reviewer/invitations/respond` with action=decline
- [ ] Confirm decline
- [ ] **Verify:** Redirected to `/reviewer/declined-invitations`
- [ ] **Verify:** (Login as EIC and ME) Both editor roles receive notification "Reviewer declined"

### E3. Reviewer Declines with Comment
> **Login as:** `REVIEWER-B` (or use a fresh reviewer assignment scenario)
- [ ] Navigate to `/reviewer` dashboard
- [ ] Find the assigned manuscript
- [ ] Use the "Decline with comment" option
- [ ] Enter a decline reason (min 3 characters, max 5000)
- [ ] Submit
- [ ] **Verify:** Reviewer status set to "Declined"
- [ ] **Verify:** The decline comment is visible to editors on the manuscript detail (but NOT to the author)
- [ ] **Verify:** Editors notified

### E4. Reviewer Invitation — Edge Cases
- [ ] Accept an **already-accepted** invitation — verify idempotent (returns ok, no error)
- [ ] Decline an **already-declined** invitation — verify idempotent (returns ok, no error)
- [ ] Use an **invalid/expired** token — verify error "Invitation not found"
- [ ] Try accepting while **not logged in** — verify redirect to login

---

## FLOW F: Peer Review Process

### F1. Reviewer Submits a Review (happy path)
> **Login as:** `REVIEWER-A`
- [ ] Navigate to `/reviewer/in-progress`
- [ ] Click on the manuscript to open `/reviewer/journals/[uuid]/review`
- [ ] **Verify:** Manuscript details visible: title, abstract, description
- [ ] **Verify:** File download available (if file was uploaded)
- [ ] Fill in the review form:
  - Overall review text
  - Comments (author-visible)
  - Confidential comments (editor-only, NOT author-visible)
  - Rating (numeric)
  - Criteria ratings (individual rubric scores)
  - Recommendation (accept / reject / minor revision / major revision)
- [ ] Submit the review
- [ ] **Verify:** Reviewer status changes to "Reviewed"
- [ ] **Verify:** Manuscript appears in `/reviewer/reviewed`
- [ ] **Verify:** (Login as EDITOR) Manuscript status may update (check workflow engine)

### F2. Reviewer Suggests Changes (request-change)
> **Login as:** `REVIEWER-C` (accept the invitation first, then...)
- [ ] While review is in-progress, use the "Suggest Changes" feature
- [ ] Specify field (title / abstract / description) and suggested change text
- [ ] Submit
- [ ] **Verify:** Change suggestion is recorded on the manuscript's `changeRequests` array
- [ ] **Verify:** Editors receive notification about reviewer suggestions
- [ ] **Verify:** The manuscript status does NOT change (suggestions are advisory only)

### F3. Reviewer Requests Deadline Extension
> **Login as:** `REVIEWER-C`
- [ ] Navigate to the assigned manuscript
- [ ] Click "Request Extension"
- [ ] Enter a reason (min 5 characters)
- [ ] Submit
- [ ] **Verify:** Extension request is recorded
- [ ] **Verify:** (Login as EDITOR) Editor receives notification about extension request

### F4. Editor Approves Deadline Extension
> **Login as:** `EDITOR`
- [ ] Navigate to the manuscript detail
- [ ] Find the reviewer with the pending extension request
- [ ] Approve the extension (specify days, e.g. 7)
- [ ] **Verify:** Reviewer's deadline is extended
- [ ] **Verify:** Reviewer receives notification "Extension approved" + email

### F5. Editor Approves Extension — Edge Cases
- [ ] Try approving an extension for a reviewer who **already submitted** — verify error
- [ ] Try approving an extension for a reviewer who **never requested one** — verify error "This reviewer has not requested a deadline extension"
- [ ] Try setting extension days **> 90** or **< 1** — verify validation error

### F6. Review Quorum Logic
The system requires **3 completed reviews** before the managing editor can make a final decision.

- [ ] After REVIEWER-A submits (1 completed, REVIEWER-B declined):
  - **Verify:** Manuscript status = "Under Peer Review" or "In Progress" (not yet at quorum)
- [ ] Assign a **replacement reviewer** (REVIEWER-D or re-assign REVIEWER-B) to fill the declined slot
- [ ] Have REVIEWER-C submit their review (2 completed):
  - **Verify:** Manuscript status = "Under Peer Review" (still below quorum)
- [ ] Have the replacement reviewer submit (3 completed):
  - **Verify:** Manuscript status transitions to "Ready for Managing Editor Notice"
  - **Verify:** Editors receive "All reviews complete" notification

### F7. Review Submission — Edge Cases
- [ ] Try submitting a review as a **pending** (not yet accepted) reviewer — verify error "Review must be in-progress before submitting a review"
- [ ] Try submitting a review for a manuscript the reviewer **is not assigned to** — verify error
- [ ] Try submitting a review **twice** (already reviewed) — verify error "Review must be in-progress before submitting a review"

---

## FLOW G: Editor Decision — APPROVED (Happy Path)

> This flow demonstrates the **two-person editorial handshake**: the Managing Editor sends the approval notice, then the Editor-in-Chief formally approves and publishes.

### G1. Managing Editor Sends Approval Notice
> **Login as:** `ME` (managing_editor — has `journal:send_approval_notice`)
- [ ] Navigate to the manuscript that reached "Ready for Managing Editor Notice"
- [ ] **Verify:** The "Send Approval Notice" button IS visible
- [ ] **Verify:** The "Approve" button (direct approve) is NOT visible (ME lacks `journal:approve`)
- [ ] Click "Send Approval Notice"
- [ ] Optionally enter a comment
- [ ] Submit
- [ ] **Verify:** Manuscript status changes to "Approved" or "Approved with Comment"
- [ ] **Verify:** Author receives approval notification + email
- [ ] **Verify:** Reviewers who completed reviews are notified of the final decision
- [ ] **Verify:** Manuscript appears in `/editor/approved`

### G1b. EIC Can Also Approve Directly (alternative path)
> **Login as:** `EIC` (editor_in_chief — has `journal:approve`)
- [ ] (Use a different manuscript at "Ready for Managing Editor Notice" or "Reviewed" status)
- [ ] **Verify:** The "Approve" button IS visible
- [ ] **Verify:** The "Send Approval Notice" button is NOT visible (EIC lacks `journal:send_approval_notice`)
- [ ] Click "Approve"
- [ ] Optionally enter a comment
- [ ] Submit
- [ ] **Verify:** Status = "Approved" or "Approved with Comment"

### G2. Approve for Publication — EIC hand-off to copy desk
> **Login as:** `EIC` (editor_in_chief — has `journal:publish`)
- [ ] Navigate to the approved manuscript
- [ ] Click "Approve for Publication"
- [ ] Optionally enter a comment
- [ ] Submit
- [ ] **Verify:** `copyEditStatus` changes to "ready_for_publication"
- [ ] **Verify:** Manuscript appears in `/editor/copy-desk`
- [ ] **Verify:** No additional author notification is sent (this is internal)

### G2b. Managing Editor CANNOT Approve for Publication
> **Login as:** `ME` (managing_editor)
- [ ] Navigate to the same approved manuscript
- [ ] **Verify:** The "Approve for Publication" button is NOT visible (ME lacks `journal:publish`)

### G3. Copy Desk Publishes
> **Login as:** `COPY-DESK` (copy_desk_editor)
- [ ] Navigate to `/editor/copy-desk`
- [ ] Find the manuscript with copyEditStatus = "ready_for_publication"
- [ ] Click "Mark Published"
- [ ] **Verify:** Status changes to "Published"
- [ ] **Verify:** `publishedAt` date is set
- [ ] **Verify:** Author receives publication notification

### G4. Published Manuscript is Publicly Visible
- [ ] Log out (or open incognito)
- [ ] Navigate to `/journals`
- [ ] **Verify:** Published manuscript appears in the public journal listing
- [ ] Click on it — navigate to `/journals/[slug]`
- [ ] **Verify:** Title, abstract, description, author, and metadata are all visible
- [ ] **Verify:** File download is available to logged-in users

### G5. Publish — Edge Cases
- [ ] Try marking a manuscript as published that was **NOT** approved for publication first — verify error "This manuscript must be approved for publication by an editor before copy desk can publish it"
- [ ] Try publishing a manuscript in "In Progress" status — verify error
- [ ] Try approving a manuscript that **hasn't reached quorum** (< 3 completed reviews) — verify the quorum gate rejects it

---

## FLOW H: Editor Decision — APPROVED WITH COMMENT

### H1. Approve with Comment (via EIC)
> **Login as:** `EIC` (editor_in_chief)
- [ ] (Use a manuscript at "Ready for Managing Editor Notice" or "Reviewed" status)
- [ ] Click "Approve" and enter a meaningful comment
- [ ] Submit
- [ ] **Verify:** Status = "Approved with Comment"
- [ ] **Verify:** The comment is saved as `editorDecisionComment`
- [ ] Continue through the publication pipeline (Approve for Publication -> Mark Published)
- [ ] **Verify:** Author can see the editor's comment on their submission detail

### H2. Send Approval Notice with Comment (via ME)
> **Login as:** `ME` (managing_editor)
- [ ] (Use a different manuscript at "Ready for Managing Editor Notice")
- [ ] Click "Send Approval Notice" and enter a meaningful comment
- [ ] Submit
- [ ] **Verify:** Status = "Approved with Comment"

---

## FLOW I: Editor Decision — DECLINED (After Review)

> Two paths to decline: the Managing Editor sends a decline notice (from "Ready for Managing Editor Notice"), or the Editor-in-Chief directly rejects (from "Reviewed" or "Ready for Managing Editor Notice").

### I1. ME Sends Decline Notice (from Ready for Managing Editor Notice)
> **Login as:** `ME` (managing_editor — has `journal:send_decline_notice`)
- [ ] Navigate to a manuscript at "Ready for Managing Editor Notice"
- [ ] **Verify:** "Send Decline Notice" button IS visible
- [ ] Click "Send Decline Notice"
- [ ] Enter a reason (min 5 characters)
- [ ] Submit
- [ ] **Verify:** Status = "Declined"
- [ ] **Verify:** The decline reason is saved as `editorDecisionComment`
- [ ] **Verify:** A comment is posted to the journal's comment feed with the reason
- [ ] **Verify:** Author receives decline notification + email with the reason
- [ ] **Verify:** Reviewers who completed reviews are notified of the final decision
- [ ] **Verify:** Manuscript appears in `/editor/declined`

### I1b. ME CANNOT Directly Reject
> **Login as:** `ME`
- [ ] **Verify:** The direct "Decline" / "Reject" button is NOT visible (ME lacks `journal:reject`)

### I2. EIC Directly Rejects (from Reviewed or Ready for ME Notice)
> **Login as:** `EIC` (editor_in_chief — has `journal:reject`)
- [ ] (Use a manuscript at "Reviewed" status — all reviewers responded but < 3 completed)
- [ ] **Verify:** "Decline" button IS visible
- [ ] **Verify:** "Send Decline Notice" button is NOT visible (EIC lacks `journal:send_decline_notice`)
- [ ] Click "Decline"
- [ ] Enter a reason
- [ ] Submit
- [ ] **Verify:** Status = "Declined"
- [ ] **Verify:** Same notifications as I1

### I3. Decline — Edge Cases
- [ ] Try declining with a **reason shorter than 5 characters** — verify validation error
- [ ] Try declining a manuscript already in "Declined" status — verify error
- [ ] Try declining a "Published" manuscript — verify error

---

## FLOW J: Editor Decision — CHANGES REQUESTED (Revision Cycle)

> Both EIC and ME can request revisions (both have `journal:request_revisions`).

### J1. Request Revisions (happy path — test with BOTH roles)
> **Login as:** `EIC` first, then repeat with `ME`
- [ ] Navigate to a manuscript in review (status: in_progress, under_peer_review, ready_for_managing_editor_notice, or reviewed)
- [ ] **Verify:** "Request Revisions" button IS visible for BOTH EIC and ME
- [ ] Click "Request Revisions"
- [ ] Enter revision details (min 10 characters)
- [ ] Submit
- [ ] **Verify:** Status = "Changes Requested"
- [ ] **Verify:** Revision details appended to `changeRequests` array (not overwriting existing reviewer suggestions)
- [ ] **Verify:** Author receives "Revisions requested" notification + email with the details
- [ ] **Verify:** Manuscript appears in `/editor/revision-requested`

### J2. Author Views Feedback and Change Requests
> **Login as:** `AUTHOR-1`
- [ ] Navigate to `/author/submissions/[id]`
- [ ] **Verify:** Status shows "Changes Requested"
- [ ] View feedback (navigate to feedback section)
- [ ] **Verify:** Editor's revision request is visible
- [ ] **Verify:** Reviewer feedback is visible (review text, comments, ratings — but NOT confidential comments)
- [ ] **Verify:** Reviewer suggestions (field-level changes) are visible

### J3. Author Resolves Field-Level Change Requests
> **Login as:** `AUTHOR-1`
- [ ] On the submission detail page, find the pending change requests
- [ ] For each field-level suggestion (title / abstract / description), enter an updated value
- [ ] Submit the updates
- [ ] **Verify:** Each change request's status flips to "resolved"
- [ ] **Verify:** If ALL change requests are resolved, manuscript status moves to "In Progress"
- [ ] **Verify:** Editors are notified that changes were resolved

### J4. Author Submits a Revision (file re-upload)
> **Login as:** `AUTHOR-1`
- [ ] Navigate to the manuscript in "Changes Requested" status
- [ ] Click "Submit Revision"
- [ ] Fill in:
  - Changes summary (min 10 characters)
  - Updated content
  - Optionally update title and abstract
  - Optionally upload a new file
- [ ] Submit
- [ ] **Verify:** Status changes to "Pending" (re-enters the queue)
- [ ] **Verify:** `currentReviewRound` increments by 1 (new review round starts)
- [ ] **Verify:** A new version is created (e.g., v2.0) visible in version history
- [ ] **Verify:** Author receives "Revision uploaded" notification
- [ ] **Verify:** Editors receive "Revision uploaded" notification
- [ ] **Verify:** Manuscript appears in `/editor/submissions` (pending list) again

### J5. Revision — Edge Cases
- [ ] Try submitting a revision when status is **NOT** "Changes Requested" — verify error "Manuscript must be changes_requested before submitting a revision"
- [ ] Submit revision with **changes summary shorter than 10 characters** — verify validation error
- [ ] Submit revision for a manuscript that **belongs to AUTHOR-2** (not AUTHOR-1) — verify error "Submission not found"

### J6. Second Review Round After Revision
- [ ] (Login as EDITOR) The revised manuscript is now at "Pending" status
- [ ] Send to review (status -> "In Progress")
- [ ] Assign 3 new reviewers (or re-assign same ones)
- [ ] **Verify:** Only the new round's reviewers count toward quorum (old round is history)
- [ ] Have reviewers submit reviews
- [ ] **Verify:** The new round's reviews drive the workflow, NOT the old round's
- [ ] Make a decision (approve / decline / request more changes)

---

## FLOW K: Reviewer Dashboard, Status Pages, and Reviewer Role Differences

> There are **three reviewer-tier roles** with different permission levels:
>
> | Role | Permissions | Notes |
> |---|---|---|
> | `associate_editor` | manage reviews, request revisions, coordinate reviews, submit review, provide feedback | **Can request revisions** — more authority than external |
> | `desk_editor` | manage reviews, coordinate reviews, submit review, provide feedback | Similar to associate but cannot request revisions |
> | `external_reviewer` | submit review, provide feedback | Review-only, no management |

### K1. Reviewer Dashboard
> **Login as:** `REVIEWER-A`
- [ ] Navigate to `/reviewer`
- [ ] **Verify:** Dashboard shows summary stats (pending, in-progress, reviewed counts)

### K2. Status-Specific Pages
- [ ] Navigate to `/reviewer/pending` — **Verify:** Lists pending (not yet accepted) assignments
- [ ] Navigate to `/reviewer/in-progress` — **Verify:** Lists accepted, in-progress reviews
- [ ] Navigate to `/reviewer/reviewed` — **Verify:** Lists completed reviews
- [ ] Navigate to `/reviewer/approved` — **Verify:** Lists manuscripts where reviewer's review led to approval
- [ ] Navigate to `/reviewer/declined` — **Verify:** Lists manuscripts where reviewer's review led to decline
- [ ] Navigate to `/reviewer/declined-invitations` — **Verify:** Lists invitations the reviewer declined

### K3. Reviewer Settings
- [ ] Navigate to `/reviewer/settings`
- [ ] **Verify:** Settings form loads (account settings)
- [ ] Update a field and save — verify success

### K4. Reviewer Notification Preferences
- [ ] Navigate to `/reviewer/notifications/preferences`
- [ ] **Verify:** Email preferences (manuscript_status, review_assignment, new_submissions) are toggleable
- [ ] **Verify:** In-app preferences (realtime, sound, desktop) are toggleable
- [ ] Toggle a preference and save — verify it persists on reload

### K5. Associate Editor — Extra Permissions
> **Login as:** a user with `associate_editor` role
- [ ] Navigate to a manuscript assigned for review
- [ ] **Verify:** The "Request Revisions" option is available (associate_editor has `journal:request_revisions`)
- [ ] **Verify:** Review management and coordination features are accessible

### K6. External Reviewer — Limited Permissions
> **Login as:** a user with `external_reviewer` role
- [ ] Navigate to the same manuscript
- [ ] **Verify:** The "Request Revisions" option is NOT available (external_reviewer lacks `journal:request_revisions`)
- [ ] **Verify:** Only review submission and feedback are available

---

## FLOW L: Editor Dashboard and Status Pages

> Both EIC and ME can access all editor pages (the page-level guard is `EDITOR_ROLES`). The difference is which **action buttons** appear on manuscript detail pages.

### L1. Editor Dashboard (test with BOTH EIC and ME)
> **Login as:** `EIC`, then repeat as `ME`
- [ ] Navigate to `/editor`
- [ ] **Verify:** Summary stats are accurate for BOTH roles (pending, in-progress, etc.)

### L2. Status-Specific Pages (accessible by both EIC and ME)
- [ ] `/editor/submissions` — Desk Review manuscripts
- [ ] `/editor/in-progress` — Manuscripts sent to review
- [ ] `/editor/under-peer-review` — Manuscripts with active peer review
- [ ] `/editor/ready-for-notice` — Manuscripts that reached quorum, awaiting decision
- [ ] `/editor/reviews` — Overview of review activity
- [ ] `/editor/revision-requested` — Manuscripts where revisions were requested
- [ ] `/editor/approved` — Approved manuscripts
- [ ] `/editor/copy-desk` — Manuscripts handed off to copy desk
- [ ] `/editor/published` — Published manuscripts
- [ ] `/editor/declined` — Declined manuscripts
- [ ] **Verify:** Each page shows the correct manuscripts for its status
- [ ] **Verify:** Both EIC and ME can see all pages (read access is shared)

### L3. Editor Enhanced Review View
- [ ] Navigate to a manuscript with completed reviews
- [ ] Open the enhanced review panel
- [ ] **Verify:** Current round reviews are displayed
- [ ] **Verify:** Prior round reviews (if any) are displayed as history, clearly separated
- [ ] **Verify:** Confidential reviewer comments are visible to editors
- [ ] **Verify:** Consensus suggestion is displayed (accept / reject / revision / inconclusive)

### L4. Action Button Visibility — EIC vs ME on Manuscript Detail
> Open the same manuscript detail page `/editor/journals/[uuid]` as each role:

**As EIC (editor_in_chief):**
- [ ] "Send to Review" — VISIBLE (has `journal:approve`)
- [ ] "Desk Decline" — VISIBLE (has `journal:reject`)
- [ ] "Approve" — VISIBLE (has `journal:approve`)
- [ ] "Approve for Publication" — VISIBLE (has `journal:publish`)
- [ ] "Request Revisions" — VISIBLE (has `journal:request_revisions`)
- [ ] "Assign Reviewers" — NOT VISIBLE (lacks `reviewer:assign`)
- [ ] "Send Approval Notice" — NOT VISIBLE (lacks `journal:send_approval_notice`)
- [ ] "Send Decline Notice" — NOT VISIBLE (lacks `journal:send_decline_notice`)

**As ME (managing_editor):**
- [ ] "Assign Reviewers" — VISIBLE (has `reviewer:assign`)
- [ ] "Send Approval Notice" — VISIBLE (has `journal:send_approval_notice`)
- [ ] "Send Decline Notice" — VISIBLE (has `journal:send_decline_notice`)
- [ ] "Request Revisions" — VISIBLE (has `journal:request_revisions`)
- [ ] "Send to Review" — NOT VISIBLE (lacks `journal:approve`)
- [ ] "Desk Decline" — NOT VISIBLE (lacks `journal:reject`)
- [ ] "Approve" — NOT VISIBLE (lacks `journal:approve`)
- [ ] "Approve for Publication" — NOT VISIBLE (lacks `journal:publish`)

---

## FLOW M: Public Features (Logged Out & Logged In)

### M1. Public Journal Listing
- [ ] Navigate to `/journals` (logged out)
- [ ] **Verify:** Only published and approved manuscripts are visible
- [ ] **Verify:** Search by title works
- [ ] **Verify:** Search by author works
- [ ] **Verify:** Category filter works
- [ ] **Verify:** Language filter works
- [ ] **Verify:** License filter works
- [ ] **Verify:** Country filter works
- [ ] **Verify:** Pagination works (if many journals)

### M2. Public Journal Detail
- [ ] Click on a published journal
- [ ] Navigate to `/journals/[slug]`
- [ ] **Verify:** Full details are visible: title, abstract, description, author, dates
- [ ] **Verify:** Metadata visible (category, language, license, country, institution)

### M3. Version History (Public)
- [ ] Navigate to `/journals/[slug]/versions`
- [ ] **Verify:** Version list is visible (for published manuscripts with multiple versions)
- [ ] Click a specific version — navigate to `/journals/[slug]/versions/[versionId]`
- [ ] **Verify:** Version details are displayed

### M4. Version Comparison
- [ ] Navigate to `/journals/[slug]/versions/compare`
- [ ] Select two versions to compare
- [ ] **Verify:** Side-by-side or diff comparison is displayed

### M5. Comments on Published Journals
- [ ] (Login as any authenticated user)
- [ ] Navigate to a published journal
- [ ] Post a comment
- [ ] **Verify:** Comment appears in the comment section
- [ ] **Verify:** Comment shows the user's name (not anonymous)

### M6. Like / Dislike
- [ ] (Login as any authenticated user)
- [ ] Navigate to a published journal
- [ ] Click "Like" — **Verify:** Like is recorded
- [ ] Click "Dislike" — **Verify:** Like is removed, dislike is recorded
- [ ] Click "Like" again — **Verify:** Dislike is removed, like is recorded

### M7. File Download
- [ ] (Login as any authenticated user)
- [ ] Navigate to a published journal that has a file
- [ ] Click "Download"
- [ ] **Verify:** File downloads with a correct filename derived from the title
- [ ] (Login as AUTHOR-2) Try downloading a **non-published** manuscript belonging to AUTHOR-1
- [ ] **Verify:** Error "You do not have permission to download this document"

### M8. Contact Form
- [ ] Navigate to `/contact`
- [ ] Fill in: First name, Last name, Email, Phone (optional), Message
- [ ] Submit
- [ ] **Verify:** Success message "Your message has been sent"
- [ ] **Verify:** Contact email is received at the configured inbox

---

## FLOW N: Admin Panel

> **Login as:** `ADMIN`

### N1. Admin Dashboard
- [ ] Navigate to `/admin`
- [ ] **Verify:** All summary statistics are visible and plausible (total journals, users, reviewers, etc.)

### N2. User Management
- [ ] Navigate to `/admin/users`
- [ ] **Verify:** User list loads with names, emails, active status, roles
- [ ] Click a user — navigate to `/admin/users/[id]`
- [ ] **Verify:** User detail shows full profile
- [ ] Create a new user (if the UI supports it)
- [ ] Deactivate a user — **Verify:** User can no longer log in (or gets 403)
- [ ] Reactivate the user — **Verify:** User can log in again

### N3. Role Management
- [ ] Navigate to `/admin/roles`
- [ ] **Verify:** All roles listed (admin, editor_in_chief, managing_editor, associate_editor, external_reviewer, author, desk_editor, copy_desk_editor)
- [ ] Click a role — navigate to `/admin/roles/[id]`
- [ ] **Verify:** Permissions assigned to the role are visible
- [ ] Assign a role to a user — **Verify:** User gains the new role's capabilities
- [ ] Remove a role from a user — **Verify:** User loses the capabilities

### N4. Permission Management
- [ ] Navigate to `/admin/permissions`
- [ ] **Verify:** Permission list loads showing resource, action, scope
- [ ] Verify key permissions exist: `journal:create`, `journal:approve`, `journal:reject`, `journal:publish`, `reviewer:assign`, etc.

### N5. Category Management
- [ ] Navigate to `/admin/categories`
- [ ] **Verify:** Categories list loads
- [ ] Create a new category — **Verify:** Appears in the list
- [ ] Edit a category name — **Verify:** Updates reflect
- [ ] Create a subcategory — **Verify:** Nested under parent
- [ ] Delete a category (if allowed) — **Verify:** Removed from list

### N6. Journal Management (Admin)
- [ ] Navigate to `/admin/journals`
- [ ] **Verify:** All manuscripts visible (all statuses)
- [ ] Verify filtering and sorting work

### N7. Audit Log
- [ ] Navigate to `/admin/audit`
- [ ] **Verify:** Audit entries are listed (if audit logging is active)
- [ ] Click an entry — navigate to `/admin/audit/[id]`
- [ ] **Verify:** Audit detail shows the event
- [ ] Navigate to `/admin/audit/dashboard`
- [ ] **Verify:** Audit statistics are displayed
- [ ] Test export — **Verify:** Export downloads

### N8. Admin Settings
- [ ] Navigate to `/admin/settings`
- [ ] **Verify:** Account settings form loads
- [ ] Update a field and save — verify success

### N9. Admin Notification Preferences
- [ ] Navigate to `/admin/notifications/preferences`
- [ ] Toggle preferences and save — verify persistence

---

## FLOW O: Visibility and Access Control

### O1. Author Cannot See Other Authors' Manuscripts
> **Login as:** `AUTHOR-2`
- [ ] Navigate to `/author/submissions`
- [ ] **Verify:** Only AUTHOR-2's own manuscripts are listed (none from AUTHOR-1)
- [ ] Try directly navigating to `/author/submissions/[AUTHOR-1-manuscript-id]`
- [ ] **Verify:** Error "Submission not found" or "Journal not found"

### O2. Reviewer Cannot See Unassigned Manuscripts
> **Login as:** `REVIEWER-A`
- [ ] Navigate to the reviewer dashboard
- [ ] **Verify:** Only manuscripts assigned to REVIEWER-A are visible
- [ ] Try accessing a manuscript not assigned to this reviewer via direct URL
- [ ] **Verify:** Appropriate error

### O3. Non-Editor Cannot Access Editor Pages
> **Login as:** `AUTHOR-1`
- [ ] Try navigating to `/editor` — **Verify:** Access denied (redirect or 403)
- [ ] Try navigating to `/editor/journals/[uuid]` — **Verify:** Access denied

### O4. Non-Admin Cannot Access Admin Pages
> **Login as:** `EDITOR`
- [ ] Try navigating to `/admin` — **Verify:** Access denied
- [ ] Try navigating to `/admin/users` — **Verify:** Access denied

### O5. Non-Published Manuscripts Not Publicly Visible
- [ ] (Logged out) Navigate to `/journals`
- [ ] **Verify:** Only "Approved", "Approved with Comment", and "Published" manuscripts appear
- [ ] Try directly navigating to `/journals/[slug-of-unpublished]` — **Verify:** 404

### O6. Confidential Comments Isolation
- [ ] (Login as AUTHOR-1) View feedback for a manuscript
- [ ] **Verify:** Reviewer's `confidentialComments` are NOT visible to the author
- [ ] (Login as EDITOR) View the same manuscript's enhanced review
- [ ] **Verify:** `confidentialComments` ARE visible to editors

### O7. Download Access Control
- [ ] Author can download their own manuscript (any status)
- [ ] Editor can download any manuscript
- [ ] Assigned reviewer can download the manuscript they're reviewing
- [ ] Unassigned reviewer CANNOT download
- [ ] Any logged-in user can download a published/approved manuscript
- [ ] Logged-out user CANNOT download

---

## FLOW P: Notification System

### P1. In-App Notifications
- [ ] Navigate to `/notifications`
- [ ] **Verify:** All notifications are listed
- [ ] **Verify:** Unread count is displayed (bell icon / dropdown at `/notifications/dropdown`)
- [ ] Mark a notification as read
- [ ] **Verify:** Unread count decreases
- [ ] Mark all as read
- [ ] **Verify:** Unread count goes to 0
- [ ] Delete a notification
- [ ] **Verify:** Notification removed from list

### P2. Notification Preferences
- [ ] Navigate to `/notifications/preferences`
- [ ] Toggle email notifications off for "manuscript_status"
- [ ] Trigger a manuscript status change
- [ ] **Verify:** In-app notification is received but NO email
- [ ] Toggle it back on
- [ ] Trigger another status change
- [ ] **Verify:** Both in-app notification AND email are received

### P3. Real-Time Notifications (SSE)
- [ ] Open the app in a browser
- [ ] In a second browser / account, trigger an action that sends a notification
- [ ] **Verify:** The notification appears in real-time (without page refresh) if realtime is enabled

---

## FLOW Q: Edge Cases and Error Handling

### Q1. Invalid State Transitions
- [ ] Try to approve a manuscript in "Desk Review" status — verify blocked
- [ ] Try to request revisions on a "Published" manuscript — verify blocked
- [ ] Try to send to review on an "Approved" manuscript — verify blocked
- [ ] Try to assign reviewers to a "Declined" manuscript — verify blocked

### Q2. Concurrent Actions
- [ ] Have two editors attempt to approve the same manuscript simultaneously
- [ ] **Verify:** One succeeds, the other gets an appropriate error (not a silent duplicate)

### Q3. Session Expiry
- [ ] Log in, then wait for the session to expire (or manually clear cookies)
- [ ] Try performing an authenticated action
- [ ] **Verify:** Redirected to login, not a 500 error

### Q4. Inactive Account
- [ ] Admin deactivates a user account
- [ ] Try performing any action as that user
- [ ] **Verify:** Error "This account is inactive" (403)

### Q5. Manuscript That Never Gets Reviewers
- [ ] Submit a manuscript, send to review, but never assign reviewers
- [ ] **Verify:** Manuscript stays at "In Progress" indefinitely — no errors, no stale status

### Q6. All Reviewers Decline
- [ ] Assign 3 reviewers; all 3 decline
- [ ] **Verify:** Manuscript status moves to "Reviewed" (all responded, 0 completed)
- [ ] **Verify:** Editor can still assign new replacement reviewers from "Reviewed" status
- [ ] **Verify:** The status transitions back to "In Progress" or "Under Peer Review" once new reviewers are added

### Q7. Review Round Isolation
- [ ] Complete a full review round -> Changes Requested -> Author revises -> new review round
- [ ] **Verify:** The old round's reviews do NOT count toward the new round's quorum
- [ ] **Verify:** The old round's reviews are still visible as history (not deleted)

---

## FLOW R: Static and Informational Pages

- [ ] `/` — Home page loads correctly
- [ ] `/journals` — Journal listing loads
- [ ] `/review-policy` — Review policy page loads
- [ ] `/privacy` — Privacy policy page loads
- [ ] `/terms` — Terms of service page loads
- [ ] `/contact` — Contact form page loads
- [ ] `/editorial` — Editorial board page loads

---

## FLOW S: Settings (All Roles)

### S1. Author Settings
> **Login as:** `AUTHOR-1`
- [ ] Navigate to `/author/settings`
- [ ] **Verify:** Account settings form loads with current data
- [ ] Update profile fields (name, institution, etc.) — verify save

### S2. Editor Settings
> **Login as:** `EDITOR`
- [ ] Navigate to `/editor/settings`
- [ ] **Verify:** Account settings form loads
- [ ] Update and save — verify

### S3. Reviewer Settings
> **Login as:** `REVIEWER-A`
- [ ] Navigate to `/reviewer/settings`
- [ ] **Verify:** Account settings form loads
- [ ] Update and save — verify

---

## Decision Outcome Summary Matrix

This matrix shows what each editor role can do from each manuscript status:

| Starting Status | Send to Review | Desk Decline | Assign Reviewers | Request Revisions | Send Approval Notice | Send Decline Notice | Approve (direct) | Reject (direct) | Approve for Pub. |
|---|---|---|---|---|---|---|---|---|---|
| **Who can** | EIC | EIC | ME | EIC + ME | ME | ME | EIC | EIC | EIC |
| Desk Review | YES | YES | - | - | - | - | - | - | - |
| Pending | YES | YES | - | - | - | - | - | - | - |
| In Progress | - | - | YES | YES | - | - | - | - | - |
| Under Peer Review | - | - | YES | YES | - | - | - | - | - |
| Ready for ME Notice | - | - | - | YES | YES | YES | - | - | - |
| Reviewed | - | - | YES | YES | - | - | YES | YES | - |
| Approved | - | - | - | - | - | - | - | - | YES |
| Approved w/ Comment | - | - | - | - | - | - | - | - | YES |
| Published | (terminal) | - | - | - | - | - | - | - | - |
| Declined | (terminal) | - | - | - | - | - | - | - | - |
| Changes Requested | - | - | - | - | - | - | - | - | - |

### Copy Desk Editor Actions:
| Starting Status | Mark Published |
|---|---|
| Approved (copyEditStatus = "ready_for_publication") | YES |
| Approved w/ Comment (copyEditStatus = "ready_for_publication") | YES |

---

## Manuscript Lifecycle State Diagram

```
                   +-----------+
                   |   START   |
                   +-----+-----+
                         |
                    (Author submits)
                         |
                         v
                  +--------------+
            +---->| Desk Review  |<----+
            |     +------+-------+     |
            |            |             |
            |    +-------+-------+     |
            |    |               |     |
            |    v               v     |
            | [EIC: Send    [EIC: Desk |
            |  to Review]    Decline]  |
            |    |               |     |
            |    v               v     |
            | +-----------+  +--------+
            | |In Progress|  |Declined|  (TERMINAL)
            | +-----+-----+  +--------+
            |       |
            |  [ME: Assign Reviewers]
            |       |
            |       v
            | +-----------------+
            | |Under Peer Review|
            | +--------+--------+
            |          |
            |    (3+ completed reviews = quorum)
            |          |
            |          v
            | +------------------------------+
            | |Ready for Managing Editor     |
            | |Notice                        |
            | +---+--------+--------+--------+
            |     |        |        |        |
            |     v        v        v        v
            |  [ME:     [ME:     [EIC+ME: [EIC:
            |  Approve  Decline  Request  Approve
            |  Notice]  Notice]  Revs]    direct]
            |     |        |        |        |
            |     v        v        |        v
            |  +--------+  |        |  +--------+
            |  |Approved|  |        |  |Approved|
            |  +---+----+  |        |  +---+----+
            |      |       |        |      |
            |      v       |        |      v
            |  [EIC: Approve        | [EIC: Approve
            |   for Publication]    |  for Publication]
            |      |       |        |      |
            |      v       |        |      v
            | +----------+ |        | +----------+
            | |Copy Desk | |        | |Copy Desk |
            | |  Ready   | |        | |  Ready   |
            | +----+-----+ |        | +----+-----+
            |      |       |        |      |
            |  [COPY-DESK: |        | [COPY-DESK:
            |   Publish]   |        |  Publish]
            |      |       |        |      |
            |      v       v        |      v
            | +----------+ +------+ | +----------+
            | |Published | |Decl. | | |Published |
            | |(TERMINAL)| |(TERM)| | |(TERMINAL)|
            | +----------+ +------+ | +----------+
            |                       |
            |                       v
            |                 +----------+
            |                 |Changes   |
            |                 |Requested |
            |                 +-----+----+
            |                       |
            |              (Author revises)
            |                       |
            |                       v
            |                  +--------+
            |                  |Pending |
            |                  +----+---+
            |                       |
            |                 (Back to review)
            |                       |
            +-----------------------+

  Also from "Reviewed" (all responded, < 3 completed):
    [EIC: Approve / Reject directly]
    [ME: Assign replacement reviewers -> back to In Progress]
    [EIC+ME: Request Revisions]
```

---

## Test Completion Checklist

| Flow | Description | Role(s) tested | Pass/Fail | Notes |
|---|---|---|---|---|
| A | Registration, Activation, Auth | All (new accounts) | | |
| B | Author Onboarding & Submission | Author | | |
| C | Editor Desk Review (send to review / desk decline) | **EIC** (+ ME negative test) | | |
| D | Reviewer Assignment | **ME** (+ EIC negative test) | | |
| E | Reviewer Invitation Response | Reviewers A/B/C | | |
| F | Peer Review Process | Reviewers + ME (extensions) | | |
| G | Decision: Approved (two-person handshake) | **ME** (notice) + **EIC** (publish) + **Copy Desk** | | |
| H | Decision: Approved with Comment | **EIC** + **ME** (separate paths) | | |
| I | Decision: Declined | **ME** (notice) + **EIC** (direct reject) | | |
| J | Decision: Changes Requested / Revision | **EIC** + **ME** + Author | | |
| K | Reviewer Dashboard & Pages | Reviewers | | |
| L | Editor Dashboard & Pages + Permission Buttons | **EIC** vs **ME** side-by-side | | |
| M | Public Features | Logged out + any user | | |
| N | Admin Panel | Admin | | |
| O | Visibility & Access Control | All roles (isolation) | | |
| P | Notification System | All roles | | |
| Q | Edge Cases & Error Handling | All roles | | |
| R | Static Pages | Logged out | | |
| S | Settings (All Roles) | Author, EIC, ME, Reviewer | | |

---

**Total test steps:** ~250+

**Estimated time:** 4-5 hours for a thorough run-through (the EIC/ME split adds ~30 minutes of role-switching).

**Recommended order:** A -> B -> C -> D -> E -> F -> G -> H -> I (needs separate manuscript) -> J (needs separate manuscript) -> K -> L -> M -> N -> O -> P -> Q -> R -> S

**Critical path for the Sunday demo:** If time is short, prioritize A -> B -> C -> D -> E -> F -> G -> L4 (permission buttons). This covers the full happy-path lifecycle AND the EIC/ME permission split, which is the most impressive thing to demonstrate.
