-- Rename perm column to perms and convert from text to text[]
ALTER TABLE "public"."kb_users" ADD COLUMN "perms" text[] NOT NULL DEFAULT '{full_control}';

-- Migrate existing single perm values to array
UPDATE "public"."kb_users" SET "perms" = ARRAY["perm"];

-- Drop old column
ALTER TABLE "public"."kb_users" DROP COLUMN "perm";
