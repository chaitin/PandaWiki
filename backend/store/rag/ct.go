package rag

import (
	"context"
	"fmt"
	"strings"

	"github.com/JohannesKaufmann/html-to-markdown/v2/converter"
	"github.com/chaitin/pandawiki/sdk/rag"
	raglite "github.com/chaitin/raglite-go-sdk"
	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/utils"
)

type CTRAG struct {
	client *raglite.Client
	logger *log.Logger
	mdConv *converter.Converter
}

func NewCTRAG(config *config.Config, logger *log.Logger) (*CTRAG, error) {
	client, err := raglite.NewClient(
		config.RAG.CTRAG.BaseURL,
		raglite.WithAPIKey(config.RAG.CTRAG.APIKey),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create raglite client: %w", err)
	}
	return &CTRAG{
		client: client,
		logger: logger.WithModule("store.vector.ct"),
		mdConv: NewHTML2MDConverter(),
	}, nil
}

func (s *CTRAG) CreateKnowledgeBase(ctx context.Context) (string, error) {
	dataset, err := s.client.Datasets.Create(ctx, &raglite.CreateDatasetRequest{
		Name: uuid.New().String(),
	})
	if err != nil {
		return "", err
	}
	return dataset.ID, nil
}

func (s *CTRAG) QueryRecords(ctx context.Context, req *QueryRecordsRequest) ([]*domain.NodeContentChunk, error) {
	var chatMsgs []rag.ChatMessage
	for _, msg := range req.HistoryMsgs {
		switch msg.Role {
		case schema.User:
			chatMsgs = append(chatMsgs, rag.ChatMessage{
				Role:    string(msg.Role),
				Content: msg.Content,
			})
		case schema.Assistant:
			chatMsgs = append(chatMsgs, rag.ChatMessage{
				Role:    string(msg.Role),
				Content: msg.Content,
			})
		default:
			continue
		}
	}
	s.logger.Debug("retrieving by history msgs", log.Any("history_msgs", req.HistoryMsgs), log.Any("chat_msgs", chatMsgs))
	data := &raglite.RetrieveRequest{
		DatasetID:           req.DatasetID,
		Query:               req.Query,
		TopK:                10,
		Metadata:            make(map[string]interface{}),
		Tags:                make([]string, 0),
		SimilarityThreshold: req.SimilarityThreshold,
	}
	if len(req.GroupIDs) > 0 {
		data.Metadata["group_ids"] = req.GroupIDs
	}
	if len(req.Tags) > 0 {
		data.Tags = req.Tags
	}
	res, err := s.client.Search.Retrieve(ctx, data)
	s.logger.Info("retrieve chunks result", log.Int("chunks count", len(res.Results)), log.String("query", req.Query))

	if err != nil {
		return nil, err
	}
	nodeChunks := make([]*domain.NodeContentChunk, len(res.Results))
	for i, chunk := range res.Results {
		nodeChunks[i] = &domain.NodeContentChunk{
			ID:      chunk.ChunkID,
			Content: chunk.Content,
			DocID:   chunk.DocumentID,
		}
	}
	return nodeChunks, nil
}

func (s *CTRAG) UpsertRecords(ctx context.Context, req *UpsertRecordsRequest) (string, error) {
	markdown := req.Content
	// if the content is html, convert it to markdown first
	if utils.IsLikelyHTML(req.Content) {
		var err error
		markdown, err = s.mdConv.ConvertString(req.Content)
		if err != nil {
			return "", fmt.Errorf("convert html to markdown failed: %w", err)
		}
	}
	data := &raglite.UploadDocumentRequest{
		DatasetID:  req.DatasetID,
		DocumentID: req.DocID,
		File:       strings.NewReader(markdown),
		Filename:   fmt.Sprintf("%s.md", req.ID),
	}
	if len(req.GroupIDs) > 0 {
		data.Metadata["group_ids"] = req.GroupIDs
	}
	if len(req.Tags) > 0 {
		data.Tags = req.Tags
	}
	res, err := s.client.Documents.Upload(ctx, data)
	if err != nil {
		return "", fmt.Errorf("upload document text failed: %w", err)
	}
	return res.DocumentID, nil
}

func (s *CTRAG) DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error {
	if err := s.client.Documents.BatchDelete(ctx, &raglite.BatchDeleteDocumentsRequest{
		DatasetID:   datasetID,
		DocumentIDs: docIDs,
	}); err != nil {
		return err
	}
	return nil
}

func (s *CTRAG) DeleteKnowledgeBase(ctx context.Context, datasetID string) error {
	if err := s.client.Datasets.Delete(ctx, datasetID); err != nil {
		return err
	}
	return nil
}

func (s *CTRAG) AddModel(ctx context.Context, model *domain.Model) (string, error) {
	modelConfig, err := s.client.Models.Create(ctx, &raglite.CreateModelRequest{
		Name:      model.Model,
		Provider:  string(model.Provider),
		ModelType: string(model.Type),
		Config: raglite.AIModelConfig{
			APIBase:         model.BaseURL,
			APIKey:          model.APIKey,
			MaxTokens:       raglite.Ptr(8192),
			ExtraParameters: model.Parameters.Map(),
		},
		IsDefault: true,
	})
	if err != nil {
		return "", err
	}
	return modelConfig.ID, nil
}

func (s *CTRAG) UpsertModel(ctx context.Context, model *domain.Model) error {
	maxTokens := model.Parameters.MaxTokens
	if maxTokens == 0 {
		maxTokens = 8192
	}
	data := raglite.UpsertModelRequest{
		Name:      model.Model,
		Provider:  string(model.Provider),
		ModelName: model.Model,
		ModelType: string(model.Type),
		Config: raglite.AIModelConfig{
			APIBase:         model.BaseURL,
			APIKey:          model.APIKey,
			MaxTokens:       raglite.Ptr(maxTokens),
			ExtraParameters: model.Parameters.Map(),
		},
		IsDefault: true,
	}
	_, err := s.client.Models.Upsert(ctx, &data)
	if err != nil {
		return err
	}
	return nil
}

func (s *CTRAG) DeleteModel(ctx context.Context, model *domain.Model) error {
	err := s.client.Models.Delete(ctx, model.ID)
	if err != nil {
		return err
	}
	return nil
}

func (s *CTRAG) GetModelList(ctx context.Context) ([]*domain.Model, error) {
	res, err := s.client.Models.List(ctx, &raglite.ListModelsRequest{})
	if err != nil {
		return nil, err
	}
	models := make([]*domain.Model, len(res.Models))
	for i, model := range res.Models {
		models[i] = &domain.Model{
			ID:      model.ID,
			Model:   model.Name,
			BaseURL: model.Config.APIBase,
			APIKey:  model.Config.APIKey,
			Type:    domain.ModelType(model.ModelType),
		}
	}
	return models, nil
}

func (s *CTRAG) UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error {
	req := &raglite.UpdateDocumentRequest{
		DatasetID:  datasetID,
		DocumentID: docID,
		Metadata:   map[string]interface{}{},
	}
	if groupIds != nil {
		req.Metadata["group_ids"] = groupIds
	}
	_, err := s.client.Documents.Update(ctx, req)
	if err != nil {
		return fmt.Errorf("update document group IDs failed: %w", err)
	}
	return nil
}

func (s *CTRAG) ListDocuments(ctx context.Context, datasetID string, documentIDs []string) ([]Document, error) {
	res, err := s.client.Documents.List(ctx, &raglite.ListDocumentsRequest{
		DocumentIDs: documentIDs,
		DatasetID:   datasetID,
	})
	if err != nil {
		return nil, err
	}
	documents := make([]Document, len(res.Documents))
	for i, document := range res.Documents {
		doc := Document{
			ID:          document.ID,
			Name:        document.Filename,
			DatasetID:   document.DatasetID,
			Status:      document.Status,
			ProgressMsg: document.ProgressMsg,
			MetaData:    document.Metadata,
			Tags:        document.Tags,
			GroupIDs:    make([]int, 0),
		}
		if document.Metadata != nil {
			if groupIDs, ok := document.Metadata["group_ids"].([]int); ok {
				doc.GroupIDs = groupIDs
			}
		}
		documents[i] = doc
	}
	return documents, nil
}
