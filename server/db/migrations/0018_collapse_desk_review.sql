-- 0018_collapse_desk_review — new submissions start at 'in-progress' instead of 'desk_review'.
--
-- The desk_review status and its UI (send-to-review, desk-decline) have been removed.
-- Any manuscripts still in desk_review are moved to in-progress so they're immediately
-- visible in the editor queue and eligible for reviewer assignment.

ALTER TABLE "journals" ALTER COLUMN "approval_status" SET DEFAULT 'in-progress';--> statement-breakpoint

UPDATE "journals" SET "approval_status" = 'in-progress'
WHERE "approval_status" = 'desk_review';--> statement-breakpoint
