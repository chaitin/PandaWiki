ALTER TABLE nodes ADD COLUMN IF NOT EXISTS rag_status text not null default '';
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS rag_message text not null default '';