-- 0017_version_file_urls — store the manuscript file URL on each version snapshot.
--
-- Before this migration manuscript_versions only remembered title/abstract/content text.
-- The preview and download endpoints always read from journals.journal_url, so every
-- historical version looked like the current file. Recording journal_url per version lets
-- each version be previewed and downloaded independently.

ALTER TABLE "manuscript_versions" ADD COLUMN IF NOT EXISTS "journal_url" text;--> statement-breakpoint

-- Backfill existing versions with the journal's current file URL.
-- Historical accuracy is limited because the column did not exist before, but this
-- gives every version a file to preview instead of leaving the column NULL.
UPDATE "manuscript_versions"
SET "journal_url" = "journals"."journal_url"
FROM "journals"
WHERE "manuscript_versions"."journal_id" = "journals"."id"
  AND "manuscript_versions"."journal_url" IS NULL;--> statement-breakpoint
