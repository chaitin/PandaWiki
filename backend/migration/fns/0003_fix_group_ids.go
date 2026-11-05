package fns

import (
	"context"
	"fmt"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"gorm.io/gorm"
)

type MigrationFixGroupIds struct {
	Name    string
	logger  *log.Logger
	ragRepo *mq.RAGRepository
}

func NewMigrationFixGroupIds(logger *log.Logger, ragRepo *mq.RAGRepository) *MigrationFixGroupIds {
	return &MigrationFixGroupIds{
		Name:    "0003_fix_group_ids",
		logger:  logger,
		ragRepo: ragRepo,
	}
}

func (m *MigrationFixGroupIds) Execute(tx *gorm.DB) error {
	var nodes []domain.Node
	if err := tx.Model(&domain.Node{}).
		Select("id", "kb_id", "doc_id").
		Where("permissions->>'answerable' = ?", consts.NodeAccessPermClosed).
		Find(&nodes).Error; err != nil {
		return fmt.Errorf("get node list failed: %w", err)
	}
	if len(nodes) == 0 {
		return nil
	}

	nodeIds := make([]string, 0, len(nodes))
	for _, node := range nodes {
		nodeIds = append(nodeIds, node.ID)
	}

	var nodeReleases []domain.NodeRelease
	if err := tx.Model(&domain.NodeRelease{}).
		Where("node_id IN (?)", nodeIds).
		Select("DISTINCT ON (node_id) id, node_id, kb_id, doc_id").
		Order("node_id, updated_at DESC").
		Find(&nodeReleases).Error; err != nil {
		return fmt.Errorf("get node release list failed: %w", err)
	}

	var nodeVectorContentRequests []*domain.NodeReleaseVectorRequest
	for _, nodeRelease := range nodeReleases {
		if nodeRelease.DocID == "" {
			continue
		}
		nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
			KBID:   nodeRelease.KBID,
			NodeID: nodeRelease.NodeID,
			DocID:  nodeRelease.DocID,
			Action: "update_group_ids",
		})
	}

	if len(nodeVectorContentRequests) > 0 {
		if err := m.ragRepo.AsyncUpdateNodeReleaseVector(context.Background(), nodeVectorContentRequests); err != nil {
			return fmt.Errorf("async update node release vector failed: %w", err)
		}
	}
	return nil
}
