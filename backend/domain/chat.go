package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
)

type ChatRequest struct {
	ConversationID string   `json:"conversation_id"`
	Message        string   `json:"message"`
	ImagePaths     []string `json:"image_paths" validate:"max=3"`
	Nonce          string   `json:"nonce"`
	AppType        AppType  `json:"app_type" validate:"required,oneof=1 2"`
	CaptchaToken   string   `json:"captcha_token"`
	// TopN 为向量检索返回片段数量上限；0 或未传表示使用默认 10；合法范围为 1～10
	TopN int `json:"top_n" validate:"omitempty,min=1,max=10"`
	// QaMode 前台智能问答：training=培训模式，work=工作模式；空表示不追加模式说明
	QaMode string `json:"qa_mode,omitempty" validate:"omitempty,oneof=training work"`

	KBID  string `json:"-" validate:"required"`
	AppID string `json:"-"`

	ModelInfo *Model `json:"-"`

	RemoteIP string           `json:"-"`
	Info     ConversationInfo `json:"-"`
	Prompt   string           `json:"-"`
}

type ChatRagOnlyRequest struct {
	Message string `json:"message" validate:"required"`

	KBID string `json:"-" validate:"required"`

	UserInfo UserInfo `json:"user_info"`
	AppType  AppType  `json:"app_type" validate:"required,oneof=1 2"`
}

type ConversationInfo struct {
	UserInfo UserInfo `json:"user_info"`
}

type UserInfo struct {
	AuthUserID uint        `json:"auth_user_id"`
	UserID     string      `json:"user_id"`
	NickName   string      `json:"name"`
	From       MessageFrom `json:"from"`
	RealName   string      `json:"real_name"`
	Email      string      `json:"email"`
	Avatar     string      `json:"avatar"` // avatar
}

func (s *ConversationInfo) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid access settings value type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s ConversationInfo) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type MessageFrom int

const (
	MessageFromGroup MessageFrom = iota + 1
	MessageFromPrivate
)

func (m MessageFrom) String() string {
	switch m {
	case MessageFromGroup:
		return "group"
	case MessageFromPrivate:
		return "private"
	default:
		return "unknown"
	}
}

type ChatSearchReq struct {
	Message      string `json:"message" validate:"required"`
	CaptchaToken string `json:"captcha_token"`

	KBID string `json:"-" validate:"required"`

	RemoteIP   string `json:"-"`
	AuthUserID uint   `json:"-"`
}

type ChatSearchResp struct {
	NodeResult []NodeContentChunkSSE `json:"node_result"`
}
