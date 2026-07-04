# Changelog — full-project-review remediation

## Phase 1 — Manuscript storage privacy (F1) — landed 2026-07-04

Branch: `fix/manuscript-storage-privacy`. Steps 1.1, 1.2 (verification), and 1.4 implemented;
Step 1.3 is an open 🛑 STOP awaiting a human decision (see below).

### What landed

- **`server/utils/journal-visibility.ts`** — `journalUrl` and `journalFormat` added to
  `PublicExcludedKey` and destructured out of `projectJournalForPublic`;
  `sanitizeJournalForReviewer` now strips `journalUrl`. All three non-editor projections
  (`public`, `owner`, `reviewer`) expose `hasManuscriptFile: Boolean(journalUrl)` instead of the
  raw storage key. Editor projection unchanged (raw row).
- **`server/utils/submissions.ts`** — `sanitizeJournalForAuthor` strips `journalUrl` and adds
  `hasManuscriptFile` (flows through `getAuthorSubmissionDetails` → author endpoints and
  `projectJournalForViewer('owner')`).
- **`app/pages/journals/[slug].vue`** — type + both `v-if` read sites (`:143`, `:187`) now use
  `journal.hasManuscriptFile`; download still goes through `/api/journals/[id]/download`.
- **`app/pages/author/submissions/[id].vue`** — type, `useFetch` default, `hasManuscriptFile`
  computed, and the download-button `v-if` read the boolean. The revision-POST body still sends
  `journalUrl: uploadedFile.fileKey` (client→server write site, intentionally kept — the server
  verifies ownership of that key).
- **`tests/journal-visibility.test.ts`** — `buildJournal` now carries `journalUrl`/`journalFormat`;
  new assertions: no `journalUrl` key in `public`/`owner`/`reviewer` output,
  `hasManuscriptFile === true` when a key exists and `false` when null, `editor` output keeps the
  raw `journalUrl`, and the public projection also strips `journalFormat`.

### In-plan decision resolved by evidence (Step 1.1.2 parenthetical)

The plan left "does public need a file indicator?" open pending confirmation of the published-file
download path. Confirmed: there is no separate published-file endpoint — the public page's
Download button (`app/pages/journals/[slug].vue:187`) renders for any authenticated viewer of an
approved journal and `server/api/journals/[id]/download.get.ts:39` grants exactly that access
(`isApproved`). Without an indicator that button would regress, so the **public projection also
gets `hasManuscriptFile`** (boolean only, never the key).

### Verified

- `download.get.ts` and `doc-preview/[uuid].get.ts` / `doc-preview/[uuid]/file.get.ts` all read
  `journalUrl` from fresh DB rows (`findJournalByParam` / `getJournalById`), not projections —
  unaffected (Step 1.2).
- Additional projection consumers checked: `server/utils/journalQuery.ts:96` (public listings —
  now also stops leaking the key) and `server/api/reviewer/journals/[uuid]/enhanced-review.get.ts`
  (reviewer). No page consuming either reads `journalUrl`.
- Gate: `pnpm lint` (0 errors, 6 pre-existing warnings) · `pnpm typecheck` clean ·
  `pnpm test` 37/37 pass. Grep proof: the only `journalUrl` left in `app/` are the two
  request-body write sites (`author/submit.vue:297`, `author/submissions/[id].vue`).

### Not verified

- No runtime smoke test (no browser drive of the public page / author submission page).
- Production data untouched and unmeasured — see the open STOP.

### 🛑 Open STOP — Step 1.3 (unguessable keys + existing blobs)

Evidence gathered, decision belongs to Afekhide:

1. **`addRandomSuffix: true` is NOT a safe flag-flip on the direct-upload path.**
   `upload-token.post.ts:33` records ownership (`recordUploadedFile`) against the **client's
   pre-computed pathname** at token-mint time; with a random suffix the final blob key would
   differ, so `verifyPendingUpload` (which looks up the exact key the client later submits,
   `fileOwnership.ts:34-45`) would 403 every attach. Adopting it requires moving/re-recording
   ownership in `handleUpload`'s `onUploadCompleted` callback (final pathname), not just the flag.
   The server-mediated path (`files.ts:85-89`) currently ignores `put()`'s return value, so it
   would also need to start using the returned pathname. Note: keys already embed
   cuid2/`crypto.randomUUID()` ids, so the suffix is defense-in-depth only.
2. **`@vercel/blob` version: 2.5.0** (`^2.5.0` in package.json).
3. **Blob census:** local dev DB has 9 journals, all with `journal_url`, all local-driver seed
   data (no real Vercel blobs locally). The count of real production blobs must be read from the
   production DB/Blob store — no access from this environment.

Decision needed: (a) whether to implement the `onUploadCompleted`-based random-suffix flow,
(b) whether/how to migrate existing production blobs and/or adopt Vercel Blob private access.
