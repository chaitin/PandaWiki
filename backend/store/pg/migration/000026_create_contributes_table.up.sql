CREATE TABLE IF NOT EXISTS contributes (
    id TEXT PRIMARY KEY,
    auth_id BIGINT,
    kb_id TEXT NOT NULL,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    node_id TEXT,
    name TEXT,
    content TEXT NOT NULL,
    reason TEXT NOT NULL,
    audit_user_id TEXT NOT NULL,
    meta JSONB,
    audit_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
