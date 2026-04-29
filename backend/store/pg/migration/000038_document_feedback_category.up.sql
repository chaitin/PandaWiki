ALTER TABLE document_feedbacks
  ADD COLUMN IF NOT EXISTS feedback_category VARCHAR(32) NOT NULL DEFAULT 'document';

COMMENT ON COLUMN document_feedbacks.feedback_category IS 'document: 关联文档纠错 general: 站点问题反馈（不关联文档）';
