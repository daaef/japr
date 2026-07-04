ALTER TABLE "journals" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "journals" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(meta_keywords, ''))) STORED;--> statement-breakpoint
CREATE INDEX "journals_search_vector_idx" ON "journals" USING gin ("search_vector");