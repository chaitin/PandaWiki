package usecase

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/cloudwego/eino/schema"

	modelkitDomain "github.com/chaitin/ModelKit/v2/domain"
	modelkit "github.com/chaitin/ModelKit/v2/usecase"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
)

type ModelUsecase struct {
	modelRepo         *pg.ModelRepository
	logger            *log.Logger
	config            *config.Config
	nodeRepo          *pg.NodeRepository
	ragRepo           *mq.RAGRepository
	ragStore          rag.RAGService
	kbRepo            *pg.KnowledgeBaseRepository
	systemSettingRepo *pg.SystemSettingRepo
	modelkit          *modelkit.ModelKit
}

func NewModelUsecase(modelRepo *pg.ModelRepository, nodeRepo *pg.NodeRepository, ragRepo *mq.RAGRepository, ragStore rag.RAGService, logger *log.Logger, config *config.Config, kbRepo *pg.KnowledgeBaseRepository, settingRepo *pg.SystemSettingRepo) *ModelUsecase {
	modelkit := modelkit.NewModelKit(logger.Logger)
	u := &ModelUsecase{
		modelRepo:         modelRepo,
		logger:            logger.WithModule("usecase.model"),
		config:            config,
		nodeRepo:          nodeRepo,
		ragRepo:           ragRepo,
		ragStore:          ragStore,
		kbRepo:            kbRepo,
		systemSettingRepo: settingRepo,
		modelkit:          modelkit,
	}
	return u
}

func (u *ModelUsecase) Create(ctx context.Context, model *domain.Model) error {
	var updatedEmbeddingModel bool
	if model.Type == domain.ModelTypeEmbedding {
		updatedEmbeddingModel = true
	}
	if err := u.modelRepo.Create(ctx, model); err != nil {
		return err
	}
	// 模型更新成功后，如果更新嵌入模型，则触发记录更新
	if updatedEmbeddingModel {
		if _, err := u.updateModeSettingConfig(ctx, "", "", "", true); err != nil {
			return err
		}
	}
	return nil
}

func (u *ModelUsecase) GetList(ctx context.Context) ([]*domain.ModelListItem, error) {
	return u.modelRepo.GetList(ctx)
}

// trigger upsert records after embedding model is updated or created
func (u *ModelUsecase) TriggerUpsertRecords(ctx context.Context) error {
	// update to new dataset
	kbList, err := u.kbRepo.GetKnowledgeBaseList(ctx)
	if err != nil {
		return fmt.Errorf("get knowledge base list failed: %w", err)
	}
	for _, kb := range kbList {
		newDatasetID, err := u.ragStore.CreateKnowledgeBase(ctx)
		if err != nil {
			return fmt.Errorf("create new dataset failed: %w", err)
		}
		if err := u.ragStore.DeleteKnowledgeBase(ctx, kb.DatasetID); err != nil {
			return fmt.Errorf("delete old dataset failed: %w", err)
		}
		if err := u.kbRepo.UpdateDatasetID(ctx, kb.ID, newDatasetID); err != nil {
			return fmt.Errorf("update knowledge base dataset id failed: %w", err)
		}
	}
	// traverse all nodes
	err = u.nodeRepo.TraverseNodesByCursor(ctx, func(nodeRelease *domain.NodeRelease) error {
		// async upsert vector content via mq
		nodeContentVectorRequests := []*domain.NodeReleaseVectorRequest{
			{
				KBID:          nodeRelease.KBID,
				NodeReleaseID: nodeRelease.ID,
				Action:        "upsert",
			},
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeContentVectorRequests); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return err
	}
	return nil
}

func (u *ModelUsecase) Update(ctx context.Context, req *domain.UpdateModelReq) error {
	var updatedEmbeddingModel bool
	if req.Type == domain.ModelTypeEmbedding {
		updatedEmbeddingModel = true
	}
	if err := u.modelRepo.Update(ctx, req); err != nil {
		return err
	}
	data := &domain.Model{
		Provider:   req.Provider,
		Model:      req.Model,
		Type:       req.Type,
		APIKey:     req.APIKey,
		BaseURL:    req.BaseURL,
		APIHeader:  req.APIHeader,
		APIVersion: req.APIVersion,
	}
	if req.IsActive != nil {
		data.IsActive = *req.IsActive
	}
	if req.Parameters != nil {
		data.Parameters = *req.Parameters
	}
	if err := u.ragStore.UpsertModel(ctx, data); err != nil {
		return err
	}
	// 模型更新成功后，如果更新嵌入模型，则触发记录更新
	if updatedEmbeddingModel {
		if _, err := u.updateModeSettingConfig(ctx, "", "", "", true); err != nil {
			return err
		}
	}
	return nil
}

func (u *ModelUsecase) GetChatModel(ctx context.Context) (*domain.Model, error) {
	var model *domain.Model
	modelModeSetting, err := u.GetModelModeSetting(ctx)
	// 获取不到模型模式时，使用手动模式, 不返回错误
	if err != nil {
		u.logger.Error("get model mode setting failed, use manual mode", log.Error(err))
	}
	if err == nil && modelModeSetting.Mode == consts.ModelSettingModeAuto && modelModeSetting.AutoModeAPIKey != "" {
		modelName := modelModeSetting.ChatModel
		if modelName == "" {
			modelName = string(consts.AutoModeDefaultChatModel)
		}
		model = &domain.Model{
			Model:    modelName,
			Type:     domain.ModelTypeChat,
			IsActive: true,
			BaseURL:  consts.AutoModeBaseURL,
			APIKey:   modelModeSetting.AutoModeAPIKey,
			Provider: domain.ModelProviderBrandBaiZhiCloud,
		}
		return model, nil
	}
	model, err = u.modelRepo.GetChatModel(ctx)
	if err != nil {
		return nil, err
	}

	return model, nil
}

func (u *ModelUsecase) GetModelByType(ctx context.Context, modelType domain.ModelType) (*domain.Model, error) {
	return u.modelRepo.GetModelByType(ctx, modelType)
}

func (u *ModelUsecase) UpdateUsage(ctx context.Context, modelID string, usage *schema.TokenUsage) error {
	return u.modelRepo.UpdateUsage(ctx, modelID, usage)
}

func (u *ModelUsecase) SwitchMode(ctx context.Context, req *domain.SwitchModeReq) error {
	// 只有配置正确才能切换模式
	if req.Mode == string(consts.ModelSettingModeAuto) {
		if req.AutoModeAPIKey == "" {
			return fmt.Errorf("auto mode api key is required")
		}
		modelName := req.ChatModel
		if modelName == "" {
			modelName = consts.GetAutoModeDefaultModel(string(domain.ModelTypeChat))
		}
		// 检查 API Key 是否有效
		check, err := u.modelkit.CheckModel(ctx, &modelkitDomain.CheckModelReq{
			Provider: string(domain.ModelProviderBrandBaiZhiCloud),
			Model:    modelName,
			BaseURL:  consts.AutoModeBaseURL,
			APIKey:   req.AutoModeAPIKey,
			Type:     string(domain.ModelTypeChat),
		})
		if err != nil {
			return fmt.Errorf("百智云模型 API Key 检查失败: %w", err)
		}
		if check.Error != "" {
			return fmt.Errorf("百智云模型 API Key 检查失败: %s", check.Error)
		}
	} else {
		needModelTypes := []domain.ModelType{
			domain.ModelTypeChat,
			domain.ModelTypeEmbedding,
			domain.ModelTypeRerank,
			domain.ModelTypeAnalysis,
		}
		for _, modelType := range needModelTypes {
			if _, err := u.modelRepo.GetModelByType(ctx, modelType); err != nil {
				return fmt.Errorf("需要配置 %s 模型", modelType)
			}
		}
	}

	oldModelModeSetting, err := u.GetModelModeSetting(ctx)
	if err != nil {
		return err
	}

	var isResetEmbeddingUpdateFlag = true
	// 只有切换手动模式时，重置isManualEmbeddingUpdated为false
	if req.Mode == string(consts.ModelSettingModeManual) {
		isResetEmbeddingUpdateFlag = false
	}

	if err := u.updateRAGModelsByMode(ctx, req.Mode, string(oldModelModeSetting.Mode), req.AutoModeAPIKey, oldModelModeSetting.IsManualEmbeddingUpdated); err != nil {
		return err
	}

	_, err = u.updateModeSettingConfig(ctx, req.Mode, req.AutoModeAPIKey, req.ChatModel, isResetEmbeddingUpdateFlag)
	if err != nil {
		return err
	}

	return nil
}

// updateModeSettingConfig 读取当前设置并更新，然后持久化
func (u *ModelUsecase) updateModeSettingConfig(ctx context.Context, mode, apiKey, chatModel string, isManualEmbeddingUpdated bool) (*domain.ModelModeSetting, error) {
	// 读取当前设置
	setting, err := u.systemSettingRepo.GetSystemSetting(ctx, consts.SystemSettingModelMode)
	if err != nil {
		return nil, fmt.Errorf("failed to get current model setting: %w", err)
	}

	var config domain.ModelModeSetting
	if err := json.Unmarshal(setting.Value, &config); err != nil {
		return nil, fmt.Errorf("failed to parse current model setting: %w", err)
	}

	// 更新设置
	if apiKey != "" {
		config.AutoModeAPIKey = apiKey
	}
	if chatModel != "" {
		config.ChatModel = chatModel
	}
	if mode != "" {
		config.Mode = consts.ModelSettingMode(mode)
	}

	config.IsManualEmbeddingUpdated = isManualEmbeddingUpdated

	// 持久化设置
	updatedValue, err := json.Marshal(config)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal updated model setting: %w", err)
	}
	if err := u.systemSettingRepo.UpdateSystemSetting(ctx, string(consts.SystemSettingModelMode), string(updatedValue)); err != nil {
		return nil, fmt.Errorf("failed to update model setting: %w", err)
	}
	return &config, nil
}

func (u *ModelUsecase) GetModelModeSetting(ctx context.Context) (domain.ModelModeSetting, error) {
	setting, err := u.systemSettingRepo.GetSystemSetting(ctx, consts.SystemSettingModelMode)
	if err != nil {
		return domain.ModelModeSetting{}, fmt.Errorf("failed to get model mode setting: %w", err)
	}
	var config domain.ModelModeSetting
	if err := json.Unmarshal(setting.Value, &config); err != nil {
		return domain.ModelModeSetting{}, fmt.Errorf("failed to parse model mode setting: %w", err)
	}
	// 无效设置检查
	if config == (domain.ModelModeSetting{}) || config.Mode == "" {
		return domain.ModelModeSetting{}, fmt.Errorf("model mode setting is invalid")
	}
	return config, nil
}

// updateRAGModelsByMode 根据模式更新 RAG 模型（embedding、rerank、analysis、analysisVL）
func (u *ModelUsecase) updateRAGModelsByMode(ctx context.Context, newMode, oldMode, autoModeAPIKey string, isManualEmbeddingUpdated bool) error {
	var isTriggerUpsertRecords = true

	// 手动切换到手动模式, 当IsManualEmbeddingUpdated为true时触发记录更新
	if oldMode == string(consts.ModelSettingModeManual) && newMode == string(consts.ModelSettingModeManual) {
		isTriggerUpsertRecords = isManualEmbeddingUpdated
	}

	ragModelTypes := []domain.ModelType{
		domain.ModelTypeEmbedding,
		domain.ModelTypeRerank,
		domain.ModelTypeAnalysis,
		domain.ModelTypeAnalysisVL,
	}

	for _, modelType := range ragModelTypes {
		var model *domain.Model

		if newMode == string(consts.ModelSettingModeManual) {
			// 获取该类型的活跃模型
			m, err := u.modelRepo.GetModelByType(ctx, modelType)
			if err != nil {
				u.logger.Warn("failed to get model by type", log.String("type", string(modelType)), log.Any("error", err))
				continue
			}
			if m == nil || !m.IsActive {
				u.logger.Warn("no active model found for type", log.String("type", string(modelType)))
				continue
			}
			model = m
		} else {
			modelName := consts.GetAutoModeDefaultModel(string(modelType))
			model = &domain.Model{
				Model:    modelName,
				Type:     modelType,
				IsActive: true,
				BaseURL:  consts.AutoModeBaseURL,
				APIKey:   autoModeAPIKey,
				Provider: domain.ModelProviderBrandBaiZhiCloud,
			}
		}

		// 更新RAG存储中的模型
		if model != nil {
			// rag store中更新失败不影响其他模型更新
			if err := u.ragStore.UpsertModel(ctx, model); err != nil {
				u.logger.Error("failed to update model in RAG store", log.String("model_id", model.ID), log.String("type", string(modelType)), log.Any("error", err))
				return fmt.Errorf("failed to update model in RAG store: %s", model.Type)
			}
			u.logger.Info("successfully updated RAG model", log.String("model name: ", string(model.Model)))
		}
	}

	// 触发记录更新
	if isTriggerUpsertRecords {
		u.logger.Info("embedding model updated, triggering upsert records")
		return u.TriggerUpsertRecords(ctx)
	}
	return nil
}
