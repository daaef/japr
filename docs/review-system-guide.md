# Review system guide

This guide describes the complete peer-review workflow in JAPR and what each user sees at every stage.

## Roles

- **Author** — submits the manuscript and uploads revisions.
- **Editor / Managing Editor** — assigns reviewers, requests revisions, and makes the final decision.
- **Reviewer / Associate Editor** — accepts or declines review invitations, submits reviews, and may request specific changes.

## Workflow overview

1. Author submits a manuscript.
2. Editor sends the manuscript to peer review and assigns up to 3 reviewers.
3. Reviewers accept, submit reviews, and optionally request changes.
4. Once enough reviews are in, the editor makes a decision:
   - approve,
   - request revisions, or
   - decline.
5. If revisions are requested, the author updates the manuscript and uploads a revised file, starting a new review round.
6. The cycle repeats until a final decision is reached.

## Statuses you will see

| Status | Meaning |
|---|---|
| `in_progress` | The manuscript is in peer review; reviewers may still be invited. |
| `under_peer_review` | At least one reviewer has submitted a review, but not everyone has responded. |
| `reviewed` | Every assigned reviewer has responded, but the quorum of 3 completed reviews has not been reached. |
| `ready_for_managing_editor_notice` | 3 completed reviews are in; the managing editor can make the final decision. |
| `changes_requested` | The editor has formally requested revisions from the author. |
| `approved` / `approved_with_comment` | The manuscript has been accepted. |
| `declined` | The manuscript has been rejected. |

## Scenario: manuscript is accepted

1. Three reviewers complete their reviews.
2. The manuscript moves to **Ready for Managing Editor Notice**.
3. The managing editor clicks **Send approval notice**.
4. The author and reviewers receive notifications linking to the manuscript page.
5. The manuscript status becomes `approved` or `approved_with_comment`.

### `approved` vs. `approved_with_comment`

- **Approved** — the managing editor sends the approval notice with no additional comment.
- **Approved with comment** — the managing editor includes an optional comment in the approval notice.

In both cases the manuscript is accepted; only the presence of a comment differs.

## Scenario: 2 reviewers reviewed, 1 remaining

1. Two reviewers submit reviews; one has not yet responded.
2. The manuscript status stays `under_peer_review`.
3. The editor sees the completed reviews in the **Peer review bundle** card.
4. The editor can:
   - wait for the remaining reviewer,
   - approve or decline a deadline-extension request if the reviewer asks for more time, or
   - assign a replacement reviewer if the remaining reviewer declines.
5. Once 3 completed reviews are in, the status becomes `ready_for_managing_editor_notice`.

## Edge case: reviewer declines the invitation

1. A reviewer clicks **Decline** on the invitation.
2. The editor receives a notification.
3. The editor opens the manuscript and assigns a replacement reviewer.
4. The declined reviewer cannot be re-invited for the same round; a fresh invitation creates a new reviewer row.

## Edge case: deadline extension request

1. A reviewer who has accepted the invitation requests more time, giving a reason.
2. The editor receives a notification.
3. The editor clicks **Approve extension** to add 7 days, or ignores/denies it.
4. If approved, the reviewer receives a notification and the new deadline is shown on the review page.

## Edge case: all assigned reviewers responded but quorum is not met

1. All assigned reviewers respond, but fewer than 3 completed reviews are in (for example, 2 completed and 1 declined).
2. The manuscript status becomes `reviewed`.
3. The editor can:
   - **Approve manuscript**,
   - **Request revisions**, or
   - **Decline manuscript**.
4. Because the quorum was not met, the consensus suggestion is not shown; the editor decides based on the available reviews.

## Edge case: inconclusive consensus

1. Three completed reviews are in, but the reviewers are split between accept and reject with no one recommending revision.
2. The consensus suggestion is **Inconclusive**.
3. The managing editor still sees **Approve** and **Decline** options and must make the final call.

## Edge case: multiple review rounds

1. After revisions are requested, the author uploads a revised file.
2. The manuscript advances to a new review round (`currentReviewRound` increments).
3. Prior-round reviewer rows, reviews, and change requests become historical context; they no longer count toward the new round's quorum.
4. The editor assigns reviewers for the new round (often the same reviewers).
5. Reviewers submit fresh reviews and can file new change requests for the revised manuscript.

## Edge case: author resolves only some field-level change requests

1. The author may click **Submit change updates** after filling in only some of the input fields.
2. The submitted fields are marked as resolved; the rest stay pending.
3. Because at least one change request is still pending, the manuscript status stays `changes_requested`.
4. The author can return and submit the remaining updates later.

## Edge case: author uploads a revision without resolving field-level change requests

1. The author can click **Submit a revision** at any time while the status is `changes_requested`.
2. The uploaded file becomes the current manuscript version and a new review round is started.
3. The status moves to `pending`, even if some field-level change requests are still open.
4. Any still-pending change requests from the previous round are no longer shown because they belong to the old round.

## Scenario: revision is requested

1. The editor decides the manuscript needs revision.
2. The editor clicks **Request revisions**, enters a revision letter, and submits.
3. The manuscript status becomes `changes_requested`.
4. The author receives a notification linking to the submission page.
5. The author sees:
   - the editor's revision letter as an editorial note,
   - any field-level reviewer change requests (title, abstract, description) with input fields,
   - any document-level reviewer change requests (page, line, excerpt) as read-only guidance.
6. The author updates the fields, uploads a revised file, and clicks **Submit a revision**.
7. The manuscript returns to `pending` / `in_progress` and a new review round starts.

## Scenario: minor revision vs. major revision

The difference is expressed through the editor's revision request and the reviewers' recommendations, not through separate buttons.

- A reviewer selects **Minor revision** or **Major revision** as their recommendation when submitting a review.
- The editor reads the consensus suggestion and the individual reviews in the **Peer review bundle**.
- The editor's revision request letter should state whether the required changes are minor or major.
- The author addresses the feedback and uploads the revised file.

## Scenario: reviewer requests specific changes

A reviewer can request changes to:

- **Title** — author types the new title in the requested-changes list.
- **Abstract** — author types the new abstract in the requested-changes list.
- **Description** — author types the new description in the requested-changes list.
- **Manuscript content** — reviewer provides page, line, original excerpt, and suggested correction. The author sees this as guidance and addresses it in the uploaded revision file.

The reviewer sees their own pending change requests on the review page. After the author uploads a revision, those requests belong to the previous round and no longer appear.

## Edge case: confidential reviewer comments

1. When submitting a review, a reviewer can enter **Confidential comments**.
2. These comments are visible only to editors and managing editors.
3. Authors and co-reviewers never see confidential comments.

## Notification behavior

- Reviewers are notified when they are assigned, when an extension is approved or denied, and when the final decision is recorded.
- Editors are notified when a reviewer accepts/declines, submits a review, requests an extension, uploads a revision, or resolves change requests.
- Authors are notified when the manuscript status changes, when revisions are formally requested, and when a final decision is made.
- Every notification links to the page where the relevant data is displayed.

## Common questions

**Can a reviewer update a change request after submitting it?**
Not yet. Reviewers can submit additional change requests to clarify or correct a mistake.

**Why doesn't the author see reviewer change requests immediately?**
Reviewer change requests are advisory input for the editor. The author is notified only when the editor formally requests revisions.

**What happens if two reviewers request different changes to the same field?**
The author can submit one new value for that field, which resolves all pending requests for that field. Per-request resolution requires a future enhancement.
