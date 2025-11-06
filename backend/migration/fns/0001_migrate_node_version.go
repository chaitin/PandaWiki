package fns

import (
	"context"
	"fmt"

	"github.com/samber/lo"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/usecase"
)

type MigrationNodeVersion struct {
	Name        string
	logger      *log.Logger
	nodeUsecase *usecase.NodeUsecase
	kbUsecase   *usecase.KnowledgeBaseUsecase
	ragRepo     *mq.RAGRepository
}

func NewMigrationNodeVersion(logger *log.Logger, nodeUsecase *usecase.NodeUsecase, kbUsecase *usecase.KnowledgeBaseUsecase, ragRepo *mq.RAGRepository) *MigrationNodeVersion {
	return &MigrationNodeVersion{
		Name:        "0001_migrate_node_version",
		logger:      logger,
		nodeUsecase: nodeUsecase,
		kbUsecase:   kbUsecase,
		ragRepo:     ragRepo,
	}
}

func (m *MigrationNodeVersion) Execute(tx *gorm.DB) error {
	ctx := context.Background()
	// 1. create kb release for all kb
	kbList, err := m.kbUsecase.GetKnowledgeBaseList(ctx)
	if err != nil {
		return fmt.Errorf("get kb list failed: %w", err)
	}
	for _, kb := range kbList {
		nodes, err := m.nodeUsecase.GetList(ctx, &domain.GetNodeListReq{
			KBID: kb.ID,
		})
		if err != nil {
			return fmt.Errorf("get node list failed: %w", err)
		}
		nodeIDs := lo.Map(nodes, func(node *domain.NodeListItemResp, _ int) string {
			return node.ID
		})
		releaseID, err := m.kbUsecase.CreateKBRelease(ctx, &domain.CreateKBReleaseReq{
			KBID:    kb.ID,
			Message: "release all old nodes",
			Tag:     "init",
			NodeIDs: nodeIDs,
		}, "")
		if err != nil {
			return fmt.Errorf("create kb release failed: %w", err)
		}
		m.logger.Info("create kb release success", log.String("kb_id", kb.ID), log.String("release_id", releaseID))
	}
	// 2. get all old node doc ids and delete in rag service
	var nodes []domain.Node
	if err := tx.Model(&domain.Node{}).
		Select("id", "kb_id", "doc_id").
		Find(&nodes).Error; err != nil {
		return fmt.Errorf("get node doc ids failed: %w", err)
	}
	if len(nodes) > 0 {
		nodeReleaseVectorRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, node := range nodes {
			if node.DocID == "" {
				continue
			}
			nodeReleaseVectorRequests = append(nodeReleaseVectorRequests, &domain.NodeReleaseVectorRequest{
				KBID:   node.KBID,
				DocID:  node.DocID,
				Action: "delete",
			})
		}
		if len(nodeReleaseVectorRequests) > 0 {
			if err := m.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeReleaseVectorRequests); err != nil {
				return fmt.Errorf("delete node release vector failed: %w", err)
			}
		}
	}

	return nil
}
