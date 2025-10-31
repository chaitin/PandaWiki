package rag

import (
	"context"
	"fmt"

	"github.com/chaitin/pandawiki/sdk/rag"
	"github.com/cloudwego/eino/schema"
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/rag/ct"
)

type RAGService interface {
	CreateKnowledgeBase(ctx context.Context) (string, error)
	UpsertRecords(ctx context.Context, datasetID string, nodeRelease *domain.NodeReleaseWithDirPath, authGroupId []int) (string, error)
	QueryRecords(ctx context.Context, datasetIDs []string, query string, groupIDs []int, similarityThreshold float64, historyMsgs []*schema.Message) ([]*domain.NodeContentChunk, error)
	DeleteRecords(ctx context.Context, datasetID string, docIDs []string) error
	DeleteKnowledgeBase(ctx context.Context, datasetID string) error
	UpdateDocumentGroupIDs(ctx context.Context, datasetID string, docID string, groupIds []int) error
	ListDocuments(ctx context.Context, datasetID string, params map[string]string) ([]rag.Document, error)

	GetModelList(ctx context.Context) ([]*domain.Model, error)
	AddModel(ctx context.Context, model *domain.Model) (string, error)
	UpdateModel(ctx context.Context, model *domain.Model) error
	DeleteModel(ctx context.Context, model *domain.Model) error
}

func NewRAGService(config *config.Config, logger *log.Logger) (RAGService, error) {
	switch config.RAG.Provider {
	case "ct":
		return ct.NewCTRAG(config, logger)
	default:
		return nil, fmt.Errorf("unsupported vector provider: %s", config.RAG.Provider)
	}
}

var ProviderSet = wire.NewSet(NewRAGService)
