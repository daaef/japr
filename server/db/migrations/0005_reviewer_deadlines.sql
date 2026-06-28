ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "review_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "deadline_extension_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "deadline_extension_reason" text;--> statement-breakpoint
ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "deadline_extended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviewers" ADD COLUMN IF NOT EXISTS "original_deadline" timestamp with time zone;
