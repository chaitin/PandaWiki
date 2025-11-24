package rag

import (
	"context"
	"fmt"

	"github.com/cloudwego/eino/schema"
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

type QueryRecordsRequest struct {
	DatasetID           string
	Query               string
	GroupIDs            []int
	Tags                []string
	SimilarityThreshold float64
	HistoryMsgs         []*schema.Message
}

type UpsertRecordsRequest struct {
	ID        string
	DatasetID string
	DocID     string
	Content   string
	GroupIDs  []int
	Tags      []string
}

type Document struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	DatasetID   string         `json:"dataset_id"`
	GroupIDs    []int          `json:"group_ids"`
	Status      string         `json:"status"`
	ProgressMsg string         `json:"progress_msg"`
	MetaData    map[string]any `json:"meta_data"`
	Tags        []string       `json:"tags"`
}

type RAGService interface {
	CreateKnowledgeBase(ctx context.Context) (string, error)
	UpsertRecords(ctx context.Context, req *UpsertRecordsRequest) (string, error)
	QueryRecords(ctx context.Context, req *QueryRecordsRequest) ([]*domain.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteKnowledgeBase(ctx context.Context, datasetID string) error
	UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error
	ListDocuments(ctx context.Context, datasetID string, documentIDs []string) ([]Document, error)

	GetModelList(ctx context.Context) ([]*domain.Model, error)
	AddModel(ctx context.Context, model *domain.Model) (string, error)
	UpsertModel(ctx context.Context, model *domain.Model) error
	DeleteModel(ctx context.Context, model *domain.Model) error
}

func NewRAGService(config *config.Config, logger *log.Logger) (RAGService, error) {
	switch config.RAG.Provider {
	case "ct":
		return NewCTRAG(config, logger)
	default:
		return nil, fmt.Errorf("unsupported vector provider: %s", config.RAG.Provider)
	}
}

var ProviderSet = wire.NewSet(NewRAGService)
