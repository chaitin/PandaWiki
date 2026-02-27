CREATE TABLE IF NOT EXISTS navs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position FLOAT8 DEFAULT 0,
    kb_id TEXT NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS nav_id text default '';
