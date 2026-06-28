ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'desk_review';--> statement-breakpoint
ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'published';
