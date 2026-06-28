CREATE TYPE "public"."approval_status" AS ENUM('pending', 'in-progress', 'approved', 'approved_with_comment', 'declined', 'changes_requested', 'reviewed', 'under_peer_review', 'ready_for_managing_editor_notice', 'desk_review', 'published');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."approval_status_simple" AS ENUM('pending', 'in-progress', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"fullname" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"country" text,
	"institution" text,
	"email_verified_at" timestamp with time zone,
	"avatar" text,
	"last_login_at" timestamp with time zone,
	"is_first_login" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"regional_expertise" jsonb DEFAULT '[]'::jsonb,
	"research_interests" jsonb DEFAULT '[]'::jsonb,
	"academic_degree" text,
	"biography" text,
	"publications" text,
	"specialization" text,
	"institution_region" text,
	"review_count" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2),
	"last_review_at" timestamp with time zone,
	"available_for_review" boolean DEFAULT true NOT NULL,
	"max_reviews_per_month" integer DEFAULT 5 NOT NULL,
	"preferred_review_types" jsonb DEFAULT '[]'::jsonb,
	"review_policy_accepted" boolean DEFAULT false NOT NULL,
	"review_policy_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"scope" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sub_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_sub_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"abstract" text,
	"cover_image" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"journal_format" text,
	"journal_language" text,
	"journal_url" text,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approval_level" integer DEFAULT 0 NOT NULL,
	"editor_decision_date" timestamp with time zone,
	"editor_decision_comment" text,
	"meta_title" text,
	"meta_keywords" text,
	"meta_description" text,
	"institution" text,
	"country" text,
	"license" jsonb,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"sub_category_id" uuid,
	"sub_sub_category_id" uuid,
	"created_by" jsonb,
	"updated_by" jsonb,
	"approved_by" jsonb,
	"declined_by" jsonb,
	"approval_comments" jsonb DEFAULT '[]'::jsonb,
	"reviewers" jsonb DEFAULT '[]'::jsonb,
	"reviewers_ratings" jsonb DEFAULT '[]'::jsonb,
	"total_ratings" integer DEFAULT 0 NOT NULL,
	"rating_percentage" numeric(5, 2),
	"change_requests" jsonb DEFAULT '[]'::jsonb,
	"managing_editor_notice" jsonb,
	"managing_editor_notice_sent_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"copy_edit_status" text,
	"accept" boolean DEFAULT true NOT NULL,
	"agree" boolean DEFAULT true NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fullname" text NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"review" text,
	"comment" text,
	"confidential_comments" text,
	"rating" integer,
	"criteria_ratings" jsonb,
	"recommendation" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_accepted" boolean DEFAULT false NOT NULL,
	"token" text,
	"assigned_at" timestamp with time zone,
	"review_submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manuscript_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_id" uuid NOT NULL,
	"version_number" text NOT NULL,
	"title" text NOT NULL,
	"abstract" text NOT NULL,
	"content" text NOT NULL,
	"changes_summary" text,
	"created_by" uuid NOT NULL,
	"parent_version_id" uuid,
	"change_requests" jsonb,
	"status" "version_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"approval_status" "approval_status_simple" DEFAULT 'pending' NOT NULL,
	"approval_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_dislikes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "my_journal_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"journal_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"region_id" uuid
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activations" ADD CONSTRAINT "activations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_categories" ADD CONSTRAINT "sub_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_sub_categories" ADD CONSTRAINT "sub_sub_categories_sub_category_id_sub_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_sub_category_id_sub_categories_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journals" ADD CONSTRAINT "journals_sub_sub_category_id_sub_sub_categories_id_fk" FOREIGN KEY ("sub_sub_category_id") REFERENCES "public"."sub_sub_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewers" ADD CONSTRAINT "reviewers_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_versions" ADD CONSTRAINT "manuscript_versions_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manuscript_versions" ADD CONSTRAINT "manuscript_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_comments" ADD CONSTRAINT "journal_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_comments" ADD CONSTRAINT "journal_comments_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_dislikes" ADD CONSTRAINT "journal_dislikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_dislikes" ADD CONSTRAINT "journal_dislikes_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_likes" ADD CONSTRAINT "journal_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_likes" ADD CONSTRAINT "journal_likes_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_journal_collections" ADD CONSTRAINT "my_journal_collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "my_journal_collections" ADD CONSTRAINT "my_journal_collections_journal_id_journals_id_fk" FOREIGN KEY ("journal_id") REFERENCES "public"."journals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activations_email_idx" ON "activations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_unique_manual" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "users_is_active_idx" ON "users" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "users_country_idx" ON "users" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verifications_identifier_value_unique" ON "verifications" USING btree ("identifier","value");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_resource_action_scope_unique" ON "permissions" USING btree ("resource","action","scope");--> statement-breakpoint
CREATE INDEX "roles_is_active_idx" ON "roles" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sub_categories_slug_idx" ON "sub_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sub_categories_category_idx" ON "sub_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "sub_sub_categories_slug_idx" ON "sub_sub_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sub_sub_categories_sub_category_idx" ON "sub_sub_categories" USING btree ("sub_category_id");--> statement-breakpoint
CREATE INDEX "journals_user_idx" ON "journals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journals_approval_status_idx" ON "journals" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "journals_category_idx" ON "journals" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "journals_country_idx" ON "journals" USING btree ("country");--> statement-breakpoint
CREATE INDEX "journals_language_idx" ON "journals" USING btree ("journal_language");--> statement-breakpoint
CREATE INDEX "reviewers_user_idx" ON "reviewers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviewers_journal_idx" ON "reviewers" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "reviewers_status_idx" ON "reviewers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviewers_token_idx" ON "reviewers" USING btree ("token");--> statement-breakpoint
CREATE INDEX "manuscript_versions_journal_version_idx" ON "manuscript_versions" USING btree ("journal_id","version_number");--> statement-breakpoint
CREATE INDEX "manuscript_versions_created_by_idx" ON "manuscript_versions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "approvals_user_idx" ON "approvals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "approvals_journal_idx" ON "approvals" USING btree ("journal_id");--> statement-breakpoint
CREATE INDEX "journal_comments_journal_idx" ON "journal_comments" USING btree ("journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_dislikes_unique" ON "journal_dislikes" USING btree ("user_id","journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_likes_unique" ON "journal_likes" USING btree ("user_id","journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "my_journal_collections_unique" ON "my_journal_collections" USING btree ("user_id","journal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_interests_unique" ON "user_interests" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "countries_region_idx" ON "countries" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "countries_name_idx" ON "countries" USING btree ("name");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("read_at");