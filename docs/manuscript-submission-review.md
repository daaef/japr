# JAPR — Code-Quality Review & Manuscript Submission Edge Cases

_Date: 2026-07-13 · Scope: manuscript submission path plus adjacent systems (auth, roles, upload/storage, workflow, notifications, tests, tooling)._

This document has two parts:

1. **Code-quality review** — a technical health check for the team.
2. **Manuscript submission edge cases** — a plain-English walkthrough of everything that can happen when an author submits, and what the app does about it.

---

## Part 1 — Code-Quality Review

### Overall assessment

This is a well-structured, security-conscious codebase. The submission path in particular shows careful thinking: file ownership is tracked to prevent hijacking, the create step is transactional, sensitive fields are stripped before data reaches authors, and much of the tricky logic is pulled into pure functions that are unit-tested. The main weaknesses are process-level (no CI) and a few spots where a security control is weaker than it looks.

**Stack:** Nuxt 4 (Vue) SPA + Nitro server routes, Drizzle ORM over Postgres, better-auth for auth/session, Vercel Blob or local disk for storage (pluggable via `STORAGE_DRIVER`), Zod validation, Tailwind + Nuxt UI. Tests run on Node's built-in runner via `tsx --test`.

### Strengths

- **File-ownership model** (`server/utils/fileOwnership.ts`). Every uploaded file records who it was issued to. Before a manuscript is created, `verifyPendingUpload` confirms the storage key belongs to the caller and hasn't already been attached; `markFileAttached` runs inside the create transaction. This closes the "attach an arbitrary or guessed storage key" gap that many upload systems miss.
- **Transactional create** (`server/api/journals/index.post.ts:69-113`). The journal row, the file-attach, and the initial version row commit together, so a crash mid-sequence can't leave an orphaned file or a journal with no version history.
- **Confidentiality by projection** (`server/utils/submissions.ts`). `sanitizeJournalForAuthor` strips the raw storage key and reviewer identities (including a reviewer's user id embedded in change requests) before anything reaches an author. This is covered by `tests/journal-visibility.test.ts`.
- **Path-traversal guard** in `resolveStoredFilePath` (local driver) rejects keys that escape the upload directory.
- **Defense in depth.** The onboarding "select interests" gate and the review-policy gate are enforced client-side *and* re-checked server-side (`index.post.ts:29-47`), so calling the API directly can't bypass them.
- **Outbound email is HTML-escaped** consistently via `escapeHtml`, and the `local` mail transport hard-fails in production rather than silently dropping mail.
- **Fail-closed permissions.** `matchesScope` in `server/utils/permissions.ts` denies by default for unknown scopes.

### Issues, roughly by priority

**High / process**

- **No CI pipeline.** There is no `.github/workflows`. The good test suite, `typecheck`, and `lint` are all manual and gate nothing. This is the single highest-leverage fix: wire `lint + typecheck + test` to run on every PR.

**Medium / security**

- **File-type validation trusts the client.** Both `server/api/files/upload.post.ts:28` and `preview.post.ts` check the browser-supplied `Content-Type` against the allow-list, with no magic-byte / content sniffing. A renamed executable sent with `Content-Type: application/pdf` passes. On the Vercel Blob path, the file extension in the storage key is also client-generated (`crypto.randomUUID().<ext>`). Recommend validating actual file signatures server-side.
- **Regex-based HTML sanitizer.** `sanitizePreviewHtml` (`server/services/docPreview.ts`) strips `<script>`, inline `on*` handlers, `javascript:` URLs, etc. with regexes. Regex sanitization of untrusted HTML is a known anti-pattern; prefer a real sanitizer (DOMPurify-equivalent). The preview is rendered in a sandboxed iframe, which mitigates but doesn't eliminate the risk.
- **"Copy/print protection" and watermark are cosmetic.** The preview's `user-select:none` and `@media print { display:none }` are trivially bypassable. Fine as UX friction, but shouldn't be relied on as a real access control.
- **Shell-string interpolation** for the LibreOffice (`docConversion.ts`) and Pandoc (`docPreview.ts`) calls. Paths are mostly server-generated so real risk is low today, but switching to `execFile` with an argument array removes the class of bug entirely.

**Medium / correctness**

- **Consent booleans default to `true`.** In `shared/validation/journals.ts:30-31`, `agree` and `accept` both `.default(true)`. So if a client omits them, validation auto-satisfies consent. The `accept` (review policy) case is separately re-checked in `index.post.ts:42-47`, but **`agree` ("I haven't published this elsewhere") is never re-verified server-side** — it's only enforced by the form. A direct API caller can submit without ever affirming it. Recommend making these required booleans (no default) and/or re-checking `agree` on the server.
- **`journalUrl` is validated only as a length-capped string,** not as a URL or storage-key format. Runtime safety comes entirely from `verifyPendingUpload`, not the schema — which is fine functionally, but the schema gives a false sense of validation.

**Low / maintainability**

- **Role-name lists are duplicated in ~5 places** rather than importing the canonical `shared/constants/roles.ts`: `isEditorRole`/`isReviewerRole` in `permissions.ts`, the inline `['admin','editor_in_chief','managing_editor']` in `index.post.ts:131`, and again in `journals/[id]/download.get.ts`. Renaming or adding a role means editing several spots or silently breaking access.
- **Email resilience relies on caller discipline.** `sendIfEmailAllowed` doesn't wrap `send()` in try/catch; each call site must remember to. Most do (`console.error` on failure), but an unwrapped caller would surface a 500. Consider encapsulating the try/catch in the helper.
- **Minor:** a Resend client is constructed per send; two divergent email HTML templates (branded vs. bare) produce inconsistent styling; `getStoredFile` buffers whole blobs in memory (fine at 10MB).

**Low / testing**

- Excellent coverage of pure domain logic (status transitions, review workflow, visibility projections, version numbering). But **zero HTTP/integration tests** — the security-critical `requireSession`, `verifyPendingUpload`, and upload MIME/size branches are not exercised end-to-end. Adding a few route-level tests for the ownership and auth paths would protect the highest-risk code.

### Suggested next steps, in order

1. Add CI (lint + typecheck + test on every PR).
2. Make `agree`/`accept` required (remove `.default(true)`) and re-check `agree` server-side.
3. Add server-side magic-byte file-type validation.
4. Centralize role-name lists to `shared/constants/roles.ts`.
5. Replace the regex HTML sanitizer with a real one; switch shell calls to `execFile`.
6. Add integration tests for the upload + ownership + auth paths.

---

## Part 2 — Manuscript Submission: Edge Cases in Plain English

When an author fills out the "Submit a Manuscript" form and clicks Submit, a lot of checks run — some in the browser, some on the server. Here's everything that can go differently, and what happens in each case. (The form is in `app/pages/author/submit.vue`; the server logic is in `server/api/journals/index.post.ts`, `server/utils/fileOwnership.ts`, and `server/utils/files.ts`.)

### Who's allowed to submit

- **Not signed in.** The submission never goes through — the server requires a valid session and returns "unauthorized." In practice you're redirected to sign in first.
- **Account deactivated.** Even with a valid login, if an admin has marked the account inactive, the server blocks the submission with a permissions error.
- **No research interests chosen yet.** New authors must pick their research interests before their first submission. If they haven't, they're stopped with the message _"Select your research interests before submitting a manuscript."_ This is checked both in the app and again on the server, so it can't be skipped.
- **Wrong role.** Only authors (and admins) can reach the submission form at all.

### The two consent checkboxes

- **"I haven't published this article elsewhere."** The form won't submit until this is ticked; if you try, you'll see _"Please confirm that you have not published this article elsewhere."_ (Worth noting for the team: this one is enforced only by the form, not re-checked on the server — see Part 1.)
- **"I accept the JAPR Review Policy."** The first time, you must open and accept the policy in a pop-up. If you decline, you get _"You must accept the review policy to submit manuscripts."_ Once accepted, it's remembered on your account so you won't be asked again. The server independently refuses any submission where the policy wasn't accepted.

### Choosing the manuscript file

- **No file selected.** The Submit button stays disabled — you simply can't submit without a file.
- **File too big (over 10 MB).** Rejected the moment you pick it, with _"File too large: … (max 10MB)."_ The server also enforces the same 10 MB limit as a backstop.
- **Wrong file type.** Only PDF, DOC, and DOCX are accepted. Anything else is rejected immediately with _"Unsupported file type."_ The server re-checks the type as well.
- **A Word file (DOC/DOCX).** Accepted, and the app tells you it "will be converted to PDF." On the main (server) setup the conversion happens automatically; if the conversion step happens to fail, your upload is **not** lost — it still goes through and can be previewed instead. On the cloud (Vercel) setup, files are kept as-is without server-side conversion.
- **Previewing before submitting.** You can preview the document first. If the preview can't be generated, you see an error in the preview window, but that doesn't block you from submitting.

### Uploading vs. submitting (a two-step process under the hood)

- **Upload fails.** If the file upload itself fails, you'll see the real reason from the server and the submission stops — nothing half-finished is created.
- **Reusing or guessing a file.** The system ties every uploaded file to the person who uploaded it. If someone tries to submit with a file reference that wasn't issued to them, or one that's already been attached to another manuscript, the server refuses with _"This file was not uploaded by you, or has already been used."_ This prevents both file hijacking and accidentally attaching the same file twice.
- **Uploaded but never submitted.** If you upload a file and then abandon the form (or something crashes), that stray file is automatically cleaned up after 24 hours, so nothing lingers indefinitely.

### The classification fields

- **Category is required.** You must choose one.
- **Sub-category depends on the category.** If the category you picked has sub-categories, you must choose one, or you'll be asked _"Please select a sub-category."_ If it has none, that field simply doesn't appear.
- **Sub-subcategory is optional** and only shows up when relevant.

### The text fields

Each field has length limits, and going outside them produces a clear per-field message rather than a generic failure:

- Title: 5–255 characters.
- Authors: 3–255 characters (comma-separated names).
- Abstract: 50–12,000 characters.
- Country: required.
- Institution and keywords: required on the form.

If several fields are invalid at once, the app lists each problem (e.g. _"title: too short; abstract: required"_) instead of a single vague error.

### What happens the moment you submit successfully

- A short "Processing and converting your document…" overlay appears, and the Submit button is disabled so you can't accidentally submit twice by double-clicking.
- The manuscript is created with the status **Desk Review** and immediately enters the editors' queue.
- The journal record, its file, and its first version ("1.0") are all saved together as one all-or-nothing operation — so you never end up with a half-created submission.
- You're taken to your submission's detail page.

### Behind-the-scenes notifications (these never block your submission)

- **Your confirmation email.** You get a "submission received" email — but if the email system hiccups, your submission still succeeds; the failure is just logged.
- **Editors are notified.** Editors get an in-app notification and an email that a new manuscript is ready for desk review. Again, if that notification fails, your submission is unaffected.
- **Email preferences respected.** Both your confirmation and the editors' emails are only sent if that person hasn't turned off those notifications.

### Two smaller things worth knowing

- **Rapid double-submit.** The form guards against double-clicks, but there's no server-side guard against the same request arriving twice, so an unusual network retry could in theory create a duplicate. (Flagged for the team in Part 1.)
- **Title-based web address (slug).** Your manuscript's URL is built from its title plus a few digits from the timestamp, so two papers with identical titles still get distinct addresses.
