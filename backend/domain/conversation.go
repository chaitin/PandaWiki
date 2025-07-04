package domain

import (
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
	ID      string  `json:"id"`
	AppName string  `json:"app_name"`
	AppType AppType `json:"app_type"`
	Subject string  `json:"subject"`

	RemoteIP string `json:"remote_ip"`

	IPAddress *IPAddress `json:"ip_address" gorm:"-"`

	CreatedAt time.Time `json:"created_at"`
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
