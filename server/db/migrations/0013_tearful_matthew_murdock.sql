CREATE TYPE "public"."reviewer_status" AS ENUM('pending', 'in-progress', 'declined', 'reviewed');--> statement-breakpoint
ALTER TABLE "reviewers" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."reviewer_status";--> statement-breakpoint
ALTER TABLE "reviewers" ALTER COLUMN "status" SET DATA TYPE "public"."reviewer_status" USING "status"::"public"."reviewer_status";