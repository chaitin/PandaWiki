package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/cloudwego/eino/schema"
)

type Conversation struct {
	ID    string `json:"id"`
	Nonce string `json:"nonce"`

	KBID  string `json:"kb_id" gorm:"index"`
	AppID string `json:"app_id" gorm:"index"`

	Subject string `json:"subject"` // subject for conversation, now is first question

	RemoteIP  string           `json:"remote_ip"`
	Info      ConversationInfo `json:"info" gorm:"type:jsonb"`
	CreatedAt time.Time        `json:"created_at"`
}

type ConversationMessage struct {
	ID             string `json:"id" gorm:"primaryKey"`
	ConversationID string `json:"conversation_id" gorm:"index"`
	AppID          string `json:"app_id" gorm:"index"`
	KBID           string `json:"kb_id"`

	Role    schema.RoleType `json:"role"`
	Content string          `json:"content"`

	// model
	Provider         ModelProvider `json:"provider"`
	Model            string        `json:"model"`
	PromptTokens     int           `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens int           `json:"completion_tokens" gorm:"default:0"`
	TotalTokens      int           `json:"total_tokens" gorm:"default:0"`

	// stats
	RemoteIP  string    `json:"remote_ip"`
	CreatedAt time.Time `json:"created_at"`

	// feedbackinfo
	Info FeedBackInfo `json:"info" gorm:"column:info;type:jsonb"`

	// parent_id
	ParentID string `json:"parent_id"`
}

type FeedBackInfo struct {
	Score           ScoreType    `json:"score"`
	FeedbackType    FeedbackType `json:"feedback_type"`
	FeedbackContent string       `json:"feedback_content"`
}

func (f *FeedBackInfo) Value() (driver.Value, error) {
	return json.Marshal(f)
}

func (f *FeedBackInfo) Scan(value any) error {
	b, ok := value.([]byte)
	if !ok {
		return errors.New("invalid feed back info type")
	}
	return json.Unmarshal(b, &f)
}

type ConversationReference struct {
	ConversationID string `json:"conversation_id" gorm:"index"`
	AppID          string `json:"app_id"`

	NodeID string `json:"node_id"`
	Name   string `json:"name"`
	URL    string `json:"url"`
}

type ConversationListReq struct {
	KBID  string  `json:"kb_id" query:"kb_id" validate:"required"`
	AppID *string `json:"app_id" query:"app_id"`

	Subject *string `json:"subject" query:"subject"`

	RemoteIP *string `json:"remote_ip" query:"remote_ip"`

	Pager
}

type ConversationListItem struct {
	ID      string           `json:"id"`
	AppName string           `json:"app_name"`
	Info    ConversationInfo `json:"info" gorm:"info;type:jsonb"` // 用户信息
	AppType AppType          `json:"app_type"`
	Subject string           `json:"subject"`

	RemoteIP string `json:"remote_ip"`

	IPAddress *IPAddress `json:"ip_address" gorm:"-"`

	CreatedAt time.Time `json:"created_at"`

	FeedBackInfo *FeedBackInfo `json:"feedback_info" gorm:"-"` // 用户反馈信息
}

type ConversationDetailResp struct {
	ID       string `json:"id"`
	AppID    string `json:"app_id"`
	Subject  string `json:"subject"`
	RemoteIP string `json:"remote_ip"`

	Messages   []*ConversationMessage   `json:"messages" gorm:"-"`
	References []*ConversationReference `json:"references" gorm:"-"`

	IPAddress *IPAddress `json:"ip_address" gorm:"-"`

	CreatedAt time.Time `json:"created_at"`
}

type MessageListReq struct {
	KBID string `json:"kb_id" query:"kb_id" validate:"required"`
	Pager
}

type ConversationMessageListItem struct {
	ID             string  `json:"id"`
	ConversationID string  `json:"conversation_id"`
	AppID          string  `json:"app_id"`
	AppType        AppType `json:"app_type"`

	Question string `json:"question"`

	// stats
	RemoteIP  string    `json:"remote_ip"`
	CreatedAt time.Time `json:"created_at"`

	// userInfo
	ConversationInfo ConversationInfo `json:"conversation_info" gorm:"column:conversation_info;type:jsonb"`
	// feedbackInfo
	Info FeedBackInfo `json:"info" gorm:"column:info;type:jsonb"`

	IPAddress *IPAddress `json:"ip_address" gorm:"-"`
}

type ShareConversationDetailResp struct {
	ID        string                      `json:"id"`
	Subject   string                      `json:"subject"`
	Messages  []*ShareConversationMessage `json:"messages" gorm:"-"`
	CreatedAt time.Time                   `json:"created_at"`
}

type ShareConversationMessage struct {
	Role      schema.RoleType `json:"role"`
	Content   string          `json:"content"`
	CreatedAt time.Time       `json:"created_at"`
}
