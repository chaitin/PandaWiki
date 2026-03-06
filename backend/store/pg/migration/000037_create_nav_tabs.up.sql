CREATE TABLE IF NOT EXISTS navs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position FLOAT8 DEFAULT 0,
    kb_id TEXT NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS nav_id text default '';

CREATE TABLE IF NOT EXISTS nav_releases (
    id TEXT PRIMARY KEY,
    nav_id TEXT NOT NULL,
    release_id TEXT NOT NULL,
    kb_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position FLOAT8 DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nav_releases_release_id ON nav_releases(release_id);
CREATE INDEX IF NOT EXISTS idx_nav_releases_kb_id ON nav_releases(kb_id);

ALTER TABLE kb_release_node_releases ADD COLUMN IF NOT EXISTS nav_id text default '';
