package domain

import "time"

const (
	DocumentFeedbackCategoryDocument = "document"
	DocumentFeedbackCategoryGeneral  = "general"
)

// DocumentFeedback 对应表 document_feedbacks
type DocumentFeedback struct {
	ID                   int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID               string    `json:"user_id" gorm:"column:user_id"`
	KBID                 string    `json:"kb_id" gorm:"column:kb_id"`
	NodeID               string    `json:"node_id" gorm:"column:node_id"`
	Content              string    `json:"content" gorm:"column:content"`
	CorrectionSuggestion string    `json:"correction_suggestion" gorm:"column:correction_suggestion"`
	Info                 []byte    `json:"info" gorm:"column:info;type:jsonb"`
	FeedbackCategory     string    `json:"feedback_category" gorm:"column:feedback_category"`
	CreatedAt            time.Time `json:"created_at" gorm:"column:created_at"`
}

func (DocumentFeedback) TableName() string {
	return "document_feedbacks"
}

// DocumentFeedbackListItem 管理端列表展示
type DocumentFeedbackListItem struct {
	ID                   int64     `json:"id"`
	UserID               string    `json:"user_id"`
	SubmitterName        *string   `json:"submitter_name" gorm:"column:submitter_name"` // 来自 auths（前台会话用户），非 users 表
	RemoteIP             *string   `json:"remote_ip" gorm:"column:remote_ip"`           // info JSON 中的提交 IP
	KBID                 string    `json:"kb_id"`
	NodeID               string    `json:"node_id"`
	NodeName             *string   `json:"node_name" gorm:"column:node_name"`
	Content              string    `json:"content"`
	CorrectionSuggestion string    `json:"correction_suggestion"`
	Info                 []byte    `json:"info"`
	FeedbackCategory     string    `json:"feedback_category"`
	CreatedAt            time.Time `json:"created_at"`
}
