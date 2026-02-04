package domain

import (
	"time"

	"github.com/chaitin/panda-wiki/consts"
)

// table: settings
type SystemSetting struct {
	ID          int                     `json:"id" gorm:"primary_key"`
	Key         consts.SystemSettingKey `json:"key"`
	Value       []byte                  `json:"value" gorm:"type:jsonb"` // JSON string
	Description string                  `json:"description"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

func (SystemSetting) TableName() string {
	return "system_settings"
}

// ModelModeSetting 模型配置结构体
type ModelModeSetting struct {
	Mode                     consts.ModelSettingMode `json:"mode"`                        // 模式: manual 或 auto
	AutoModeAPIKey           string                  `json:"auto_mode_api_key"`           // 百智云 API Key
	ChatModel                string                  `json:"chat_model"`                  // 自定义对话模型名称
	IsManualEmbeddingUpdated bool                    `json:"is_manual_embedding_updated"` // 已废弃, 手动模式下嵌入模型是否更新, 
}

// UploadDeniedExtensionsSetting 上传禁止扩展名配置
// INSERT INTO "public"."system_settings" ("key", "value") VALUES ('upload', '{"denied_extensions": ["jsp"]}')
type UploadDeniedExtensionsSetting struct {
	DeniedExtensions []string `json:"denied_extensions"` // 禁止上传的文件扩展名列表，不带点，如 ["jsp", "php", "exe"]
}
