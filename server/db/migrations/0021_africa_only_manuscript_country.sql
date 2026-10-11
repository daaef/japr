-- 0021_africa_only_manuscript_country — manuscript submissions must be scoped to an
-- African country; author/user profile country stays global. Flags the 5 African
-- sub-regions seeded in server/db/seeds/system.ts so the API/UI can filter on it.

ALTER TABLE "regions" ADD COLUMN "is_african" boolean DEFAULT false NOT NULL;--> statement-breakpoint

UPDATE "regions" SET "is_african" = true
WHERE "name" IN ('Central Africa', 'East Africa', 'North Africa', 'Southern Africa', 'West Africa');
