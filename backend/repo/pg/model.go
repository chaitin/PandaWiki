package pg

import (
	"context"

	"github.com/cloudwego/eino/schema"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type ModelRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewModelRepository(db *pg.DB, logger *log.Logger) *ModelRepository {
	return &ModelRepository{db: db, logger: logger.WithModule("repo.pg.model")}
}

func (r *ModelRepository) Create(ctx context.Context, model *domain.Model) error {
	// 容错：必需模型不允许显式关闭
	if model.Type.IsRequired() {
		model.IsActive = true
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(model).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *ModelRepository) GetList(ctx context.Context) ([]*domain.ModelListItem, error) {
	var models []*domain.ModelListItem
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Order("created_at ASC").
		Find(&models).Error; err != nil {
		return nil, err
	}
	return models, nil
}

func (r *ModelRepository) Update(ctx context.Context, req *domain.UpdateModelReq) error {
	param := domain.ModelParam{}
	if req.Parameters != nil {
		param = *req.Parameters
	}
	updateMap := map[string]any{
		"model":       req.Model,
		"api_key":     req.APIKey,
		"api_header":  req.APIHeader,
		"base_url":    req.BaseURL,
		"api_version": req.APIVersion,
		"provider":    req.Provider,
		"type":        req.Type,
		"parameters":  param,
	}
	if req.IsActive != nil {
		// 容错：必需模型不允许显式关闭，传了 false 则忽略该字段
		if !req.Type.IsRequired() {
			updateMap["is_active"] = *req.IsActive
		}
	}
	return r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", req.ID).
		Updates(updateMap).Error
}

func (r *ModelRepository) Updates(ctx context.Context, modelId string, updateMap map[string]interface{}) error {
	return r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("id = ?", modelId).
		Updates(updateMap).Error
}

func (r *ModelRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// delete model
		if err := tx.Where("id = ?", id).
			Delete(&domain.Model{}).Error; err != nil {
			return err
		}
		return nil
	})
}

func (r *ModelRepository) GetChatModel(ctx context.Context) (*domain.Model, error) {
	var model domain.Model
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("type = ?", domain.ModelTypeChat).
		First(&model).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func (r *ModelRepository) GetModelByType(ctx context.Context, modelType domain.ModelType) (*domain.Model, error) {
	var model domain.Model
	if err := r.db.WithContext(ctx).
		Model(&domain.Model{}).
		Where("type = ?", modelType).
		First(&model).Error; err != nil {
		return nil, err
	}
	return &model, nil
}

func (r *ModelRepository) UpdateUsage(ctx context.Context, modelID string, usage *schema.TokenUsage) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// update model usage
		if err := tx.Model(&domain.Model{}).
			Where("id = ?", modelID).
			Updates(map[string]any{
				"prompt_tokens":     gorm.Expr("prompt_tokens + ?", usage.PromptTokens),
				"completion_tokens": gorm.Expr("completion_tokens + ?", usage.CompletionTokens),
				"total_tokens":      gorm.Expr("total_tokens + ?", usage.TotalTokens),
			}).Error; err != nil {
			return err
		}
		return nil
	})
}
