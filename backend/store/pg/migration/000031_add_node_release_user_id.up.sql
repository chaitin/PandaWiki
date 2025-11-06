ALTER TABLE node_releases ADD COLUMN IF NOT EXISTS publisher_id text default '';
ALTER TABLE node_releases ADD COLUMN IF NOT EXISTS editor_id text default '';