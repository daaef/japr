# Problem: Copy desk editor is under-powered; desk review step is unnecessary friction

## Symptoms

1. **Copy desk editor cannot do what the admin needs them to do.** The role was designed for
   post-approval production work (copy edit, final edit, prepare for publication). In practice
   the admin wants them to act as a deputy — handling the same editorial workflow the EIC and
   managing editor handle when the admin is unavailable. Today they can view manuscripts and
   mark them published, but they cannot see the pending/in-progress/under-review queues, assign
   reviewers, send to review, approve, decline, request revisions, or receive notifications
   about new submissions.

2. **The "send to review" step adds a manual gate with no value.** Every new submission lands in
   `desk_review` status and sits there until an editor clicks "Send to review" to move it to
   `in_progress`. Only then can reviewers be assigned. For this team the step is overhead — they
   want manuscripts to arrive ready for reviewer assignment immediately, with EIC, managing
   editor, and copy desk editor all notified on submission.

3. **No desk reject is needed.** The team confirmed they do not need the ability to decline a
   manuscript before peer review starts. The `desk_review -> declined` transition and
   `desk-decline.post.ts` endpoint are unused.

## Root causes

- `copy_desk_editor` is absent from `editorRoleKeys` and `EDITOR_ROLES`
  (`shared/constants/roles.ts:14,21`). Every notification fan-out in
  `server/utils/editorNotifications.ts` and the submission handler
  (`server/api/journals/index.post.ts:134`) uses `EDITOR_ROLES`, so copy desk editors are
  never notified.
- `copy_desk_editor`'s seeded permissions (`shared/constants/permissions.ts:129-133`) are
  limited to `copy_edit`, `final_edit`, `prepare_publication`, `read` — none of the editorial
  workflow permissions (`journal:approve`, `journal:reject`, `reviewer:assign`,
  `journal:request_revisions`, `journal:send_approval_notice`, `journal:send_decline_notice`).
- Eight editor queue endpoints (`server/api/editor/journals/pending.get.ts`, etc.) use
  `requireEditor` which excludes `copy_desk_editor`.
- The frontend mirrors this: `EDITOR_ROLES` gates the editor queue pages
  (`app/pages/editor/submissions.vue`, `in-progress.vue`, etc.).
- `desk_review` is hardcoded as the initial status in `index.post.ts:93` and as the DB column
  default (`server/db/schema/journals.ts:52`).
- `ALLOWED_MANUSCRIPT_TRANSITIONS` only allows `desk_review -> [in_progress, declined]`
  (`shared/constants/manuscriptStatus.ts:72-75`).

## Scope

- Promote `copy_desk_editor` into `EDITOR_ROLES` (editorial workflow powers, NOT `ADMIN_ROLES`).
- Grant `copy_desk_editor` the same seeded permissions as the union of EIC + managing editor.
- Remove the `desk_review` status from the submission flow (new manuscripts start at
  `in_progress`).
- Remove the `send-to-review` endpoint and its UI.
- Remove the `desk-decline` endpoint and its UI.
- Notify EIC + managing editor + copy desk editor on every new submission (already happens for
  the first two via `EDITOR_ROLES`; promoting copy desk editor into that group handles the third).
