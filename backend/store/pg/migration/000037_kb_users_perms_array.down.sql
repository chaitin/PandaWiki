-- Add back the single perm column
ALTER TABLE "public"."kb_users" ADD COLUMN "perm" text NOT NULL DEFAULT 'full_control';

-- Migrate first element of array back to single value
UPDATE "public"."kb_users" SET "perm" = "perms"[1] WHERE array_length("perms", 1) > 0;

-- Drop array column
ALTER TABLE "public"."kb_users" DROP COLUMN "perms";
