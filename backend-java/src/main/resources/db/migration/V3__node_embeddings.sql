-- ====== 向量检索：node_embeddings 表 ======
-- 存储已发布文档内容的 embedding 向量（float8[]），不依赖 pgvector 扩展
CREATE TABLE IF NOT EXISTS "node_embeddings" (
    "id"          text NOT NULL,
    "node_id"     text NOT NULL,
    "kb_id"       text NOT NULL,
    "chunk_index" int  NOT NULL DEFAULT 0,
    "chunk_text"  text NOT NULL,
    "embedding"   float8[] NOT NULL,
    "created_at"  timestamptz DEFAULT now(),
    "updated_at"  timestamptz DEFAULT now(),
    PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_node_embeddings_kb_id" ON "node_embeddings" ("kb_id");
CREATE INDEX IF NOT EXISTS "idx_node_embeddings_node_id" ON "node_embeddings" ("node_id");
