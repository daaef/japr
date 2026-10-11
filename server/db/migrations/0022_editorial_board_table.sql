-- 0022_editorial_board_table — moves the previously hardcoded
-- shared/content/editorial-board.ts into an admin-editable table. Carries over the 9
-- real current board members so nothing is lost; sortOrder preserves today's display
-- order exactly.

CREATE TABLE "editorial_board_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "role" text NOT NULL,
  "section" text NOT NULL,
  "email" text,
  "institution" text,
  "region" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "editorial_board_members_section_idx" ON "editorial_board_members" ("section");--> statement-breakpoint
CREATE INDEX "editorial_board_members_active_idx" ON "editorial_board_members" ("is_active");--> statement-breakpoint

INSERT INTO "editorial_board_members" ("name", "role", "section", "email", "institution", "region", "sort_order") VALUES
('Emmanuel O. Oritsejafor', 'Editor in Chief', 'Leadership', 'eoritsejafor@nccu.edu', 'North Carolina Central University', NULL, 0),
('Allan Cooper', 'Managing Editor', 'Leadership', 'Allan.Cooper@NCCU.edu', 'North Carolina Central University', NULL, 1),
('Ellen Whitworth', 'Desk Editor', 'Leadership', 'ewhitwo2@nccu.edu', 'North Carolina Central University', NULL, 2),
('George Kieh, Jr', 'Associate Editor', 'Associate Editors', NULL, 'Texas Southern University, Houston Texas', 'Diaspora- Europe, North, and South America', 3),
('Nurudeen Akinyemi', 'Associate Editor', 'Associate Editors', NULL, 'Kennesaw State University, Georgia', 'West Africa', 4),
('Nourdin Bejjit', 'Associate Editor', 'Associate Editors', NULL, 'Mohammed V. University, Rabat', 'North Africa', 5),
('Muiu Mueni', 'Associate Editor', 'Associate Editors', NULL, 'Winston Salem University, North Carolina', 'East Africa', 6),
('Musifiky Mwansali', 'Associate Editor', 'Associate Editors', NULL, 'Northwestern University & African Union', 'Central Africa', 7),
('Tennyson Dunston Joseph', 'Associate Editor', 'Associate Editors', NULL, 'North Carolina Central University', 'The Diaspora and the Caribbean.', 8);--> statement-breakpoint
