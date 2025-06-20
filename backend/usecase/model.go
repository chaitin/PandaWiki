package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"time"

	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/utils"
)

type ModelUsecase struct {
	modelRepo *pg.ModelRepository
	logger    *log.Logger
	config    *config.Config
	nodeRepo  *pg.NodeRepository
	ragRepo   *mq.RAGRepository
	ragStore  rag.RAGService
	kbRepo    *pg.KnowledgeBaseRepository
}

func NewModelUsecase(modelRepo *pg.ModelRepository, nodeRepo *pg.NodeRepository, ragRepo *mq.RAGRepository, ragStore rag.RAGService, logger *log.Logger, config *config.Config, kbRepo *pg.KnowledgeBaseRepository) *ModelUsecase {
	u := &ModelUsecase{
		modelRepo: modelRepo,
		logger:    logger.WithModule("usecase.model"),
		config:    config,
		nodeRepo:  nodeRepo,
		ragRepo:   ragRepo,
		ragStore:  ragStore,
		kbRepo:    kbRepo,
	}
	if err := u.initEmbeddingAndRerankModel(context.Background()); err != nil {
		logger.Error("init embedding & rerank model failed", log.Any("error", err))
	}
	return u
}

func (u *ModelUsecase) initEmbeddingAndRerankModel(ctx context.Context) error {
	// FIXME: just for test, remove it later
	// shared_key by BaiZhiCloud
	sharedKey := "sk-r8tmBtcU1JotPDPnlgZLOY4Z6Dbb7FufcSeTkFpRWA5v4Llr"
	baseURL := "https://model-square.app.baizhi.cloud/v1"

	isReady := false
	// wait for raglite to be ready
	for i := 0; i < 10; i++ {
		models, err := u.ragStore.GetModelList(ctx)
		if err != nil {
			u.logger.Error("wait for raglite to be ready", log.Any("error", err))
			time.Sleep(1 * time.Second)
			continue
		}
		isReady = true
		if len(models) > 0 {
			return nil
		} else {
			break
		}
	}
	if !isReady {
		return fmt.Errorf("raglite is not ready")
	}
	embeddingModel := &domain.Model{
		ID:         uuid.New().String(),
		Provider:   domain.ModelProviderBrandBaiZhiCloud,
		Model:      "bge-m3",
		APIKey:     sharedKey,
		APIHeader:  "",
		BaseURL:    baseURL,
		APIVersion: "",
		Type:       domain.ModelTypeEmbedding,
	}
	id, err := u.ragStore.AddModel(ctx, embeddingModel)
	if err != nil {
		return fmt.Errorf("init embedding model failed: %w", err)
	}
	embeddingModel.ID = id
	if err := u.modelRepo.Create(ctx, embeddingModel); err != nil {
		return fmt.Errorf("init embedding model failed: %w", err)
	}
	rerankModel := &domain.Model{
		ID:         uuid.New().String(),
		Provider:   domain.ModelProviderBrandBaiZhiCloud,
		Model:      "bge-reranker-v2-m3",
		APIKey:     sharedKey,
		APIHeader:  "",
		BaseURL:    baseURL,
		APIVersion: "",
		Type:       domain.ModelTypeRerank,
	}
	id, err = u.ragStore.AddModel(ctx, rerankModel)
	if err != nil {
		return fmt.Errorf("init rerank model failed: %w", err)
	}
	rerankModel.ID = id
	if err := u.modelRepo.Create(ctx, rerankModel); err != nil {
		return fmt.Errorf("init rerank model failed: %w", err)
	}
	return nil
}

func (u *ModelUsecase) Create(ctx context.Context, model *domain.Model) error {
	if err := u.modelRepo.Create(ctx, model); err != nil {
		return err
	}
	if model.Type == domain.ModelTypeEmbedding || model.Type == domain.ModelTypeRerank {
		if id, err := u.ragStore.AddModel(ctx, model); err != nil {
			return err
		} else {
			model.ID = id
		}
	}
	if model.Type == domain.ModelTypeEmbedding {
		return u.TriggerUpsertRecords(ctx)
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

func (u *ModelUsecase) Get(ctx context.Context, id string) (*domain.ModelDetailResp, error) {
	return u.modelRepo.Get(ctx, id)
}

func (u *ModelUsecase) Update(ctx context.Context, req *domain.UpdateModelReq) error {
	if err := u.modelRepo.Update(ctx, req); err != nil {
		return err
	}
	if req.Type == domain.ModelTypeEmbedding || req.Type == domain.ModelTypeRerank {
		if err := u.ragStore.UpdateModel(ctx, &domain.Model{
			ID:      req.ID,
			Model:   req.Model,
			Type:    req.Type,
			BaseURL: req.BaseURL,
			APIKey:  req.APIKey,
		}); err != nil {
			return err
		}
	}
	if req.Type == domain.ModelTypeEmbedding {
		return u.TriggerUpsertRecords(ctx)
	}
	return nil
}

func (u *ModelUsecase) GetChatModel(ctx context.Context) (*domain.Model, error) {
	return u.modelRepo.GetChatModel(ctx)
}

func (u *ModelUsecase) UpdateUsage(ctx context.Context, modelID string, usage *schema.TokenUsage) error {
	return u.modelRepo.UpdateUsage(ctx, modelID, usage)
}

func (u *ModelUsecase) GetUserModelList(ctx context.Context, req *domain.GetProviderModelListReq) (*domain.GetProviderModelListResp, error) {
	switch provider := domain.ModelProvider(req.Provider); provider {
	case domain.ModelProviderBrandMoonshot, domain.ModelProviderBrandDeepSeek, domain.ModelProviderBrandAzureOpenAI, domain.ModelProviderBrandVolcengine:
		return &domain.GetProviderModelListResp{
			Models: domain.ModelProviderBrandModelsList[domain.ModelProvider(req.Provider)],
		}, nil
	case domain.ModelProviderBrandOpenAI, domain.ModelProviderBrandHunyuan, domain.ModelProviderBrandBaiLian:
		u, err := url.Parse(req.BaseURL)
		if err != nil {
			return nil, err
		}
		u.Path = path.Join(u.Path, "/models")
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", req.APIKey))
		resp, err := http.DefaultClient.Do(request)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("failed to get models: %s", resp.Status)
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		type OpenAIResp struct {
			Object string `json:"object"`
			Data   []struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		var models OpenAIResp
		err = json.Unmarshal(body, &models)
		if err != nil {
			return nil, err
		}
		modelsList := make([]domain.ProviderModelListItem, 0)
		for _, model := range models.Data {
			modelsList = append(modelsList, domain.ProviderModelListItem{
				Model: model.ID,
			})
		}
		return &domain.GetProviderModelListResp{
			Models: modelsList,
		}, nil
	case domain.ModelProviderBrandOllama:
		// get from ollama http://10.10.16.24:11434/api/tags
		u, err := url.Parse(req.BaseURL)
		if err != nil {
			return nil, err
		}
		u.Path = "/api/tags"
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return nil, err
		}
		if req.APIHeader != "" {
			headers := utils.GetHeaderMap(req.APIHeader)
			for k, v := range headers {
				request.Header.Set(k, v)
			}
		}
		resp, err := http.DefaultClient.Do(request)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		var models domain.GetProviderModelListResp
		err = json.Unmarshal(body, &models)
		if err != nil {
			return nil, err
		}
		return &models, nil
	case domain.ModelProviderBrandSiliconFlow, domain.ModelProviderBrandBaiZhiCloud:
		if req.Type == domain.ModelTypeEmbedding || req.Type == domain.ModelTypeRerank {
			if provider == domain.ModelProviderBrandBaiZhiCloud {
				if req.Type == domain.ModelTypeEmbedding {
					return &domain.GetProviderModelListResp{
						Models: []domain.ProviderModelListItem{
							{
								Model: "bge-m3",
							},
						},
					}, nil
				} else {
					return &domain.GetProviderModelListResp{
						Models: []domain.ProviderModelListItem{
							{
								Model: "bge-reranker-v2-m3",
							},
						},
					}, nil
				}
			}
		}
		u, err := url.Parse(req.BaseURL)
		if err != nil {
			return nil, err
		}
		u.Path = "/v1/models"
		q := u.Query()
		q.Set("type", "text")
		q.Set("sub_type", "chat")
		u.RawQuery = q.Encode()
		request, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
		if err != nil {
			return nil, err
		}
		request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", req.APIKey))
		resp, err := http.DefaultClient.Do(request)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("failed to get models: %s", resp.Status)
		}
		type SiliconFlowModelResp struct {
			Object string `json:"object"`
			Data   []struct {
				ID string `json:"id"`
			} `json:"data"`
		}
		var models SiliconFlowModelResp
		err = json.Unmarshal(body, &models)
		if err != nil {
			return nil, err
		}
		modelsList := make([]domain.ProviderModelListItem, 0, len(models.Data))
		for _, model := range models.Data {
			modelsList = append(modelsList, domain.ProviderModelListItem{
				Model: model.ID,
			})
		}
		return &domain.GetProviderModelListResp{
			Models: modelsList,
		}, nil
	default:
		return nil, fmt.Errorf("invalid provider: %s", req.Provider)
	}
}
