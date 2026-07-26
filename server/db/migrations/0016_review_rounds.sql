-- 0016_review_rounds — F-A: peer-review rounds.
--
-- Before this migration a revised manuscript kept its previous draft's reviewer rows, so
-- syncJournalReviewStatus and approve.post.ts counted stale round-1 reviews toward the
-- round-2 quorum: a revision could reach `ready_for_managing_editor_notice` (a transition
-- ALLOWED_MANUSCRIPT_TRANSITIONS sanctions, so nothing logged) and be approved without a
-- single reviewer reading it. Rounds make "which reviews count" explicit.
--
-- Backfill: every existing journal is round 1 and every existing reviewer row belongs to
-- round 1, which the column defaults already express — no UPDATE needed, and NOT NULL is
-- safe to apply immediately.

ALTER TABLE "journals" ADD COLUMN IF NOT EXISTS "current_review_round" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "round_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

-- Widen the uniqueness rule from (journal, user) to (journal, user, round). Dropping and
-- recreating under the SAME name keeps server/db/check.ts's required-index assertion valid
-- and keeps assign-reviewers.post.ts's conflict target resolvable. Both statements are in
-- one migration so no window exists where the table has no uniqueness guard at all.
DROP INDEX IF EXISTS "reviewers_journal_user_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviewers_journal_user_idx" ON "reviewers" ("journal_id", "user_id", "round_number");
