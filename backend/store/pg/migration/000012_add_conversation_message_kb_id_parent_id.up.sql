ALTER TABLE conversation_messages ADD COLUMN kb_id TEXT NOT NULL DEFAULT '';

UPDATE conversation_messages as cm
    SET kb_id = (SELECT kb_id from conversations WHERE cm.conversation_id = conversations.id);

ALTER Table conversation_messages ADD COLUMN parent_id TEXT DEFAULT '';