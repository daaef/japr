ALTER TABLE "activations" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activations" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;