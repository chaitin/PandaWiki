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
	ModelTypeChat       ModelType = "chat"
	ModelTypeEmbedding  ModelType = "embedding"
	ModelTypeRerank     ModelType = "rerank"
	ModelTypeAnalysis   ModelType = "analysis"
	ModelTypeAnalysisVL ModelType = "analysis-vl"
)

func (t ModelType) IsRequired() bool {
	return t != ModelTypeAnalysisVL
}

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

type UpdateModelReq struct {
	ID string `json:"id" validate:"required"`
	BaseModelInfo
	Parameters *ModelParam `json:"parameters"`
	IsActive   *bool       `json:"is_active"`
}

type CheckModelReq struct {
	BaseModelInfo
	Parameters *ModelParam `json:"parameters"`
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

func (p ModelParam) Map() map[string]any {
	return map[string]any{
		"context_window":       p.ContextWindow,
		"max_tokens":           p.MaxTokens,
		"r1_enabled":           p.R1Enabled,
		"support_computer_use": p.SupportComputerUse,
		"support_images":       p.SupportImages,
		"support_prompt_cache": p.SupportPromptCache,
		"temperature":          p.Temperature,
	}
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
	Type       ModelType     `json:"type" validate:"required,oneof=chat embedding rerank analysis analysis-vl"`
}

type ManualModelOperationType string

const (
	ManualModelOperationTypeCreate ManualModelOperationType = "create"
	ManualModelOperationTypeUpdate ManualModelOperationType = "update"
)

// ManualModelOperation represents a single manual mode model create or update instruction.
type ManualModelOperation struct {
	ID string `json:"id"`
	BaseModelInfo
	Parameters *ModelParam              `json:"parameters"`
	IsActive   *bool                    `json:"is_active"`
	Operation  ManualModelOperationType `json:"operation" validate:"required,oneof=create update"`
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
	Type      ModelType `json:"type" query:"type" validate:"required,oneof=chat embedding rerank analysis analysis-vl"`
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

type SwitchModeReq struct {
	Mode           string                 `json:"mode" validate:"required,oneof=manual auto"`
	AutoModeAPIKey string                 `json:"auto_mode_api_key"` // 百智云 API Key
	ChatModel      string                 `json:"chat_model"`        // 自定义对话模型名称
	ManualModels   []ManualModelOperation `json:"manual_models" validate:"dive"`
}

type SwitchModeResp struct {
	Message string `json:"message"`
}

// ValidateManualModelOperations enforces manual model instructions constraints.
func (req *SwitchModeReq) ValidateManualModelOperations() error {
	if len(req.ManualModels) == 0 {
		return nil
	}

	// 基础约束：每种模型类型只能出现一次
	typeSeen := make(map[ModelType]struct{})
	// 当存在 create 操作时，需要校验是否补齐所有必需模型
	hasCreateOperation := false
	requiredTypes := []ModelType{ModelTypeChat, ModelTypeEmbedding, ModelTypeRerank, ModelTypeAnalysis}

	for idx := range req.ManualModels {
		op := req.ManualModels[idx]
		if op.Operation != ManualModelOperationTypeCreate && op.Operation != ManualModelOperationTypeUpdate {
			return fmt.Errorf("manual_models[%d] 不支持的操作类型: %s", idx, op.Operation)
		}
		if _, duplicated := typeSeen[op.Type]; duplicated {
			return fmt.Errorf("manual_models[%d] 模型类型 %s 只能配置一个", idx, op.Type)
		}
		typeSeen[op.Type] = struct{}{}

		// 容错：必需模型不允许显式关闭，传了 false 则忽略该字段
		if op.Type.IsRequired() && op.IsActive != nil && !*op.IsActive {
			req.ManualModels[idx].IsActive = nil
		}

		switch op.Operation {
		case ManualModelOperationTypeCreate:
			hasCreateOperation = true
			if op.Provider == "" || op.Model == "" || op.BaseURL == "" || op.Type == "" {
				return fmt.Errorf("manual_models[%d] create 操作缺少必要的模型信息", idx)
			}
		case ManualModelOperationTypeUpdate:
			if op.ID == "" {
				return fmt.Errorf("manual_models[%d] update 操作需要提供 id", idx)
			}
		}
	}

	if hasCreateOperation {
		for _, modelType := range requiredTypes {
			if _, ok := typeSeen[modelType]; !ok {
				return fmt.Errorf("create 操作需要包含 %s 模型", modelType)
			}
		}
	}

	return nil
}
