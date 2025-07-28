CREATE TABLE "public"."comments" (
        "id" TEXT NOT NULL,
        "user_id" text NULL,
        "node_id" text NOT NULL ,
        "kb_id" text NOT NULL,
        "info" JSONB NULL,
        "parent_id" text DEFAULT NULL,
        "root_id" text DEFAULT NULL,
        "content" text NOT NULL,
        "created_at" timestamptz NULL,
        PRIMARY KEY ("id")
);

CREATE INDEX "idx_comments_node_id" ON "public"."comments" ("node_id");
CREATE INDEX "idx_comments_kb_id" ON "public"."comments"("kb_id");

