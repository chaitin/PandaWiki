package domain

type ChatRequest struct {
	ConversationID string  `json:"conversation_id"`
	Message        string  `json:"message" validate:"required"`
	Nonce          string  `json:"nonce"`
	AppType        AppType `json:"app_type" validate:"required,oneof=1 2 3"`

	KBID  string `json:"-" validate:"required"`
	AppID string `json:"-"`

	ModelInfo *Model `json:"-"`

	RemoteIP string           `json:"-"`
	Info     ConversationInfo `json:"-"`
}

type ConversationInfo struct {
	UserInfo UserInfo `json:"user_info"`
}
type UserInfo struct {
	UserID   string `json:"user_id"`
	NickName string `json:"name"`
	From     string `json:"from"`
	RealName string `json:"real_name"`
	Email    string `json:"email"`
}
