package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	modelkitConsts "github.com/chaitin/ModelKit/v2/consts"
	modelkitDomain "github.com/chaitin/ModelKit/v2/domain"
)

type ModelProvider string

const (
	ModelProviderBrandBaiZhiCloud ModelProvider = "BaiZhiCloud"
)

type ModelType string

const (
	ModelTypeChat      ModelType = "chat"
	ModelTypeEmbedding ModelType = "embedding"
	ModelTypeRerank    ModelType = "rerank"
	ModelTypeAnalysis  ModelType = "analysis"
)

type Model struct {
	ID         string        `json:"id"`
	Provider   ModelProvider `json:"provider"`
	Model      string        `json:"model"`
	APIKey     string        `json:"api_key"`
	APIHeader  string        `json:"api_header"`
	BaseURL    string        `json:"base_url"`
	APIVersion string        `json:"api_version"` // for azure openai
	Type       ModelType     `json:"type" gorm:"default:chat;uniqueIndex"`

	IsActive bool `json:"is_active" gorm:"default:false"`

	PromptTokens     uint64 `json:"prompt_tokens" gorm:"default:0"`
	CompletionTokens uint64 `json:"completion_tokens" gorm:"default:0"`
	TotalTokens      uint64 `json:"total_tokens" gorm:"default:0"`

	Parameters ModelParam `json:"parameters" gorm:"column:parameters;type:jsonb"` // 高级参数

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ToModelkitModel converts domain.Model to modelkitDomain.PandaModel
func (m *Model) ToModelkitModel() (*modelkitDomain.ModelMetadata, error) {
	provider := modelkitConsts.ParseModelProvider(string(m.Provider))
	modelType := modelkitConsts.ParseModelType(string(m.Type))

	return &modelkitDomain.ModelMetadata{
		Provider:    provider,
		ModelName:   m.Model,
		APIKey:      m.APIKey,
		BaseURL:     m.BaseURL,
		APIVersion:  m.APIVersion,
		APIHeader:   m.APIHeader,
		ModelType:   modelType,
		Temperature: m.Parameters.Temperature,
	}, nil
}

type ModelListItem struct {
	ID         string        `json:"id"`
	Provider   ModelProvider `json:"provider"`
	Model      string        `json:"model"`
	APIKey     string        `json:"api_key"`
	APIHeader  string        `json:"api_header"`
	BaseURL    string        `json:"base_url"`
	APIVersion string        `json:"api_version"` // for azure openai
	Type       ModelType     `json:"type"`

	IsActive bool `json:"is_active" gorm:"default:false"`

	PromptTokens     uint64     `json:"prompt_tokens"`
	CompletionTokens uint64     `json:"completion_tokens"`
	TotalTokens      uint64     `json:"total_tokens"`
	Parameters       ModelParam `json:"parameters" gorm:"column:parameters;type:jsonb"`
}

type CreateModelReq struct {
	BaseModelInfo
	Parameters *ModelParam `json:"parameters"`
}

type UpdateModelReq struct {
	ID string `json:"id" validate:"required"`
	BaseModelInfo
	Parameters *ModelParam `json:"parameters"`
	IsActive   *bool       `json:"is_active"`
}

type CheckModelReq struct {
	BaseModelInfo
}

type ModelParam struct {
	ContextWindow      int      `json:"context_window"`
	MaxTokens          int      `json:"max_tokens"`
	R1Enabled          bool     `json:"r1_enabled"`
	SupportComputerUse bool     `json:"support_computer_use"`
	SupportImages      bool     `json:"support_images"`
	SupportPromptCache bool     `json:"support_prompt_cache"`
	Temperature        *float32 `json:"temperature"`
}

// Value implements the driver.Valuer interface for GORM
func (p ModelParam) Value() (driver.Value, error) {
	return json.Marshal(p)
}

// Scan implements the sql.Scanner interface for GORM
func (p *ModelParam) Scan(value interface{}) error {
	if value == nil {
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, p)
	case string:
		return json.Unmarshal([]byte(v), p)
	default:
		return fmt.Errorf("cannot scan %T into ModelParam", value)
	}
}

type BaseModelInfo struct {
	Provider   ModelProvider `json:"provider" validate:"required"`
	Model      string        `json:"model" validate:"required"`
	BaseURL    string        `json:"base_url" validate:"required"`
	APIKey     string        `json:"api_key"`
	APIHeader  string        `json:"api_header"`
	APIVersion string        `json:"api_version"` // for azure openai
	Type       ModelType     `json:"type" validate:"required,oneof=chat embedding rerank analysis"`
}

type CheckModelResp struct {
	Error   string `json:"error"`
	Content string `json:"content"`
}

type GetProviderModelListReq struct {
	Provider  string    `json:"provider" query:"provider" validate:"required"`
	BaseURL   string    `json:"base_url" query:"base_url" validate:"required"`
	APIKey    string    `json:"api_key" query:"api_key"`
	APIHeader string    `json:"api_header" query:"api_header"`
	Type      ModelType `json:"type" query:"type" validate:"required,oneof=chat embedding rerank analysis"`
}

type GetProviderModelListResp struct {
	Models []ProviderModelListItem `json:"models"`
}

type ProviderModelListItem struct {
	Model string `json:"model"`
}

type ActivateModelReq struct {
	ModelID string `json:"model_id" validate:"required"`
}
