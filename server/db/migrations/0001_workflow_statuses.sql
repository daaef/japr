ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'under_peer_review';--> statement-breakpoint
ALTER TYPE "public"."approval_status" ADD VALUE IF NOT EXISTS 'ready_for_managing_editor_notice';
