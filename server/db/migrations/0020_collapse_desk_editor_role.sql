-- 0020_collapse_desk_editor_role — desk_editor and copy_desk_editor are the same role going
-- forward (stakeholder-confirmed 2026-10-10). Move anyone holding desk_editor to
-- copy_desk_editor, then retire desk_editor rather than deleting it outright.

-- 1. Give copy_desk_editor to every user who currently holds desk_editor (skip if already held).
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT "ur"."user_id", (SELECT "id" FROM "roles" WHERE "name" = 'copy_desk_editor')
FROM "user_roles" "ur"
JOIN "roles" "r" ON "r"."id" = "ur"."role_id"
WHERE "r"."name" = 'desk_editor'
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- 2. Remove the old desk_editor assignments.
DELETE FROM "user_roles"
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'desk_editor');--> statement-breakpoint

-- 3. Remove desk_editor's permission grants.
DELETE FROM "role_permissions"
WHERE "role_id" = (SELECT "id" FROM "roles" WHERE "name" = 'desk_editor');--> statement-breakpoint

-- 4. Soft-deactivate the role row rather than hard-deleting it (roles.isActive exists for
-- exactly this; keeps referential history intact).
UPDATE "roles" SET "is_active" = false WHERE "name" = 'desk_editor';--> statement-breakpoint
