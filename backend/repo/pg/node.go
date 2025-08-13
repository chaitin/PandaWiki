package pg

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/google/uuid"
	"github.com/samber/lo"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type NodeRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewNodeRepository(db *pg.DB, logger *log.Logger) *NodeRepository {
	return &NodeRepository{db: db, logger: logger.WithModule("repo.pg.node")}
}

func (r *NodeRepository) Create(ctx context.Context, req *domain.CreateNodeReq) (string, error) {
	nodeID, err := uuid.NewV7()
	if err != nil {
		return "", err
	}
	nodeIDStr := nodeID.String()
	err = r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// check count
		var count int64
		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", req.KBID).
			Count(&count).Error; err != nil {
			return err
		}
		if count >= int64(req.MaxNode) {
			return errors.New("node is too many")
		}
		var maxPos float64
		query := tx.WithContext(ctx).
			Model(&domain.Node{}).
			Where("kb_id = ?", req.KBID)

		if req.ParentID == "" {
			query = query.Where("parent_id IS NULL OR parent_id = ''")
		} else {
			query = query.Where("parent_id = ?", req.ParentID)
		}

		if err := query.
			Select("COALESCE(MAX(position::float), 0)").
			Scan(&maxPos).Error; err != nil {
			return err
		}

		var newPos float64
		if req.Position != nil { // user specify position
			if *req.Position > domain.MaxPosition || *req.Position < 0 {
				return errors.New("user specify position out of range")
			}
			newPos = *req.Position
		} else { // default the last
			newPos = maxPos + (domain.MaxPosition-maxPos)/2.0
			if newPos-maxPos < domain.MinPositionGap {
				if err := r.reorderPositionsByParentID(tx, req.KBID, req.ParentID); err != nil {
					return err
				}
			}
		}

		now := time.Now()

		visibility := domain.NodeVisibilityPublic
		if req.Visibility != nil {
			visibility = *req.Visibility
		}
		if req.Type == domain.NodeTypeFolder {
			visibility = domain.NodeVisibilityPublic
		}
		node := &domain.Node{
			ID:         nodeIDStr,
			KBID:       req.KBID,
			Name:       req.Name,
			Content:    req.Content,
			Meta:       domain.NodeMeta{Emoji: req.Emoji},
			Type:       req.Type,
			ParentID:   req.ParentID,
			Position:   newPos,
			Status:     domain.NodeStatusDraft,
			Visibility: visibility,
			CreatedAt:  now,
			UpdatedAt:  now,
		}

		return tx.Create(node).Error
	})
	if err != nil {
		return "", err
	}

	return nodeIDStr, nil
}

func (r *NodeRepository) GetList(ctx context.Context, req *domain.GetNodeListReq) ([]*domain.NodeListItemResp, error) {
	var nodes []*domain.NodeListItemResp
	query := r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Where("nodes.kb_id = ?", req.KBID).
		Select("nodes.id, nodes.type, nodes.status, nodes.visibility, nodes.name, nodes.parent_id, nodes.position, nodes.created_at, nodes.updated_at, nodes.meta->>'summary' as summary, nodes.meta->>'emoji' as emoji")
	if req.Search != "" {
		searchPattern := "%" + req.Search + "%"
		query = query.Where("name LIKE ? OR content LIKE ?", searchPattern, searchPattern)
	}
	if err := query.Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func (r *NodeRepository) UpdateNodesVisibility(ctx context.Context, kbID string, ids []string, visibility domain.NodeVisibility) error {
	return r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Where("id IN ?", ids).
		Where("kb_id = ?", kbID).
		Updates(map[string]any{
			"visibility": visibility,
			"status":     domain.NodeStatusDraft,
		}).Error
}

func (r *NodeRepository) GetLatestNodeReleaseByNodeIDs(ctx context.Context, kbID string, ids []string) ([]*domain.NodeRelease, error) {
	var nodeReleases []*domain.NodeRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Where("node_id IN ?", ids).
		Where("kb_id = ?", kbID).
		Select("DISTINCT ON (node_id) id, node_id, kb_id, doc_id").
		Order("node_id, updated_at DESC").
		Find(&nodeReleases).Error; err != nil {
		return nil, err
	}
	return nodeReleases, nil
}

func (r *NodeRepository) UpdateNodeContent(ctx context.Context, req *domain.UpdateNodeReq) error {
	// Use transaction to ensure data consistency
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get current node data with row-level lock
		var currentNode domain.Node
		if err := tx.Model(&domain.Node{}).
			Where("id = ?", req.ID).
			Where("kb_id = ?", req.KBID).
			// Use FOR UPDATE to lock the row until the transaction is complete
			Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&currentNode).Error; err != nil {
			return err
		}

		updateMap := make(map[string]any)
		updateStatus := false

		// Compare and update Name
		if req.Name != nil && *req.Name != currentNode.Name {
			updateMap["name"] = *req.Name
			updateStatus = true
		}

		// Compare and update Content
		if req.Content != nil && *req.Content != currentNode.Content {
			updateMap["content"] = *req.Content
			updateStatus = true
		}

		if req.Position != nil && *req.Position != currentNode.Position { // user specify position
			updateMap["position"] = *req.Position
			if *req.Position > domain.MaxPosition || *req.Position < 0 {
				return errors.New("user specify position out of range")
			}
			updateStatus = true
		}

		// Handle multiple meta field updates
		if req.Emoji != nil || req.Summary != nil {
			metaExpr := "meta"
			var args []any
			metaUpdated := false

			// Compare and update Emoji
			if req.Emoji != nil && *req.Emoji != currentNode.Meta.Emoji {
				// First jsonb_set: jsonb_set(meta, '{emoji}', to_jsonb(?::text))
				metaExpr = "jsonb_set(" + metaExpr + ", '{emoji}', to_jsonb(?::text))"
				args = append(args, *req.Emoji) // First parameter for emoji
				metaUpdated = true
			}

			// Compare and update Summary
			if req.Summary != nil && *req.Summary != currentNode.Meta.Summary {
				// Second jsonb_set: jsonb_set(previous_expr, '{summary}', to_jsonb(?::text))
				metaExpr = "jsonb_set(" + metaExpr + ", '{summary}', to_jsonb(?::text))"
				args = append(args, *req.Summary) // Second parameter for summary
				metaUpdated = true
			}

			if metaUpdated {
				updateMap["meta"] = gorm.Expr(metaExpr, args...)
				updateStatus = true
			}
		}

		// Compare and update Visibility
		if req.Visibility != nil && *req.Visibility != currentNode.Visibility {
			updateMap["visibility"] = *req.Visibility
			updateStatus = true
		}

		// If any field is updated, set status to draft
		if updateStatus {
			updateMap["status"] = domain.NodeStatusDraft
		}

		// Perform update if there are changes
		if len(updateMap) > 0 {
			// Use the transaction's DB instance for the update
			return tx.Model(&domain.Node{}).
				Where("id = ?", req.ID).
				Where("kb_id = ?", req.KBID).
				Updates(updateMap).Error
		}
		return nil
	})

	// Return any error from the transaction
	return err
}

func (r *NodeRepository) GetByID(ctx context.Context, id string) (*domain.NodeDetailResp, error) {
	var node *domain.NodeDetailResp
	if err := r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Where("id = ?", id).
		First(&node).Error; err != nil {
		return nil, err
	}
	return node, nil
}

func (r *NodeRepository) Delete(ctx context.Context, kbID string, ids []string) ([]string, error) {
	docIDs := make([]string, 0)
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// check if node.parent_id in ids
		var parentIDs []string
		if err := tx.Model(&domain.Node{}).
			Where("parent_id IN ?", ids).
			Select("parent_id").
			Find(&parentIDs).Error; err != nil {
			return err
		}
		if len(parentIDs) > 0 {
			return domain.ErrNodeParentIDInIDs
		}
		var nodes []*domain.Node
		if err := tx.Model(&domain.Node{}).
			Where("id IN ?", ids).
			Where("kb_id = ?", kbID).
			Clauses(clause.Returning{Columns: []clause.Column{{Name: "doc_id"}}}).
			Delete(&nodes).Error; err != nil {
			return err
		}
		// delete node release
		var nodeReleases []*domain.NodeRelease
		if err := tx.Model(&domain.NodeRelease{}).
			Where("node_id IN ?", ids).
			Clauses(clause.Returning{Columns: []clause.Column{{Name: "doc_id"}}}).
			Delete(&nodeReleases).Error; err != nil {
			return err
		}
		for _, node := range nodes {
			if node.DocID != "" {
				docIDs = append(docIDs, node.DocID)
			}
		}
		for _, nodeRelease := range nodeReleases {
			if nodeRelease.DocID != "" {
				docIDs = append(docIDs, nodeRelease.DocID)
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return lo.Uniq(docIDs), nil
}

func (r *NodeRepository) GetNodeByID(ctx context.Context, id string) (*domain.Node, error) {
	var node *domain.Node
	if err := r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Where("id = ?", id).
		First(&node).Error; err != nil {
		return nil, err
	}
	return node, nil
}

func (r *NodeRepository) GetNodeNameByNodeIDs(ctx context.Context, ids []string) (map[string]string, error) {
	nodesMap := make(map[string]string)
	for _, chunk := range lo.Chunk(ids, 1000) {
		var nodes []*domain.Node
		if err := r.db.WithContext(ctx).
			Model(&domain.Node{}).
			Where("id IN ?", chunk).
			Select("id, name").
			Find(&nodes).Error; err != nil {
			return nil, err
		}
		for _, node := range nodes {
			nodesMap[node.ID] = node.Name
		}
	}
	return nodesMap, nil
}

func (r *NodeRepository) GetNodeReleaseByID(ctx context.Context, id string) (*domain.NodeRelease, error) {
	var nodeRelease *domain.NodeRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Where("id = ?", id).
		First(&nodeRelease).Error; err != nil {
		return nil, err
	}
	return nodeRelease, nil
}

func (r *NodeRepository) GetLatestNodeReleaseByNodeID(ctx context.Context, nodeID string) (*domain.NodeRelease, error) {
	var nodeRelease *domain.NodeRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Where("node_id = ?", nodeID).
		Order("updated_at DESC").
		First(&nodeRelease).Error; err != nil {
		return nil, err
	}
	return nodeRelease, nil
}

func (r *NodeRepository) GetNodeReleasesByDocIDs(ctx context.Context, ids []string) (map[string]*domain.NodeRelease, error) {
	var nodeReleases []*domain.NodeRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Where("visibility = ?", domain.NodeVisibilityPublic).
		Where("doc_id IN ?", ids).
		Find(&nodeReleases).Error; err != nil {
		return nil, err
	}
	nodesMap := make(map[string]*domain.NodeRelease)
	for _, nodeRelease := range nodeReleases {
		nodesMap[nodeRelease.DocID] = nodeRelease
	}
	return nodesMap, nil
}

// GetRecommendNodeListByIDs get node list by ids
func (r *NodeRepository) GetRecommendNodeListByIDs(ctx context.Context, kbID string, releaseID string, ids []string) ([]*domain.RecommendNodeListResp, error) {
	var nodes []*domain.RecommendNodeListResp
	if err := r.db.WithContext(ctx).
		Model(&domain.KBReleaseNodeRelease{}).
		Joins("LEFT JOIN node_releases ON node_releases.id = kb_release_node_releases.node_release_id").
		Where("node_releases.kb_id = ?", kbID).
		Where("kb_release_node_releases.release_id = ?", releaseID).
		Where("node_releases.node_id IN ?", ids).
		Where("node_releases.visibility = ?", domain.NodeVisibilityPublic).
		Select("node_releases.node_id as id, node_releases.name, node_releases.type, node_releases.meta->>'summary' as summary, node_releases.meta->>'emoji' as emoji, node_releases.parent_id, node_releases.position").
		Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func (r *NodeRepository) GetRecommendNodeListByParentIDs(ctx context.Context, kbID string, releaseID string, parentIDs []string) (map[string][]*domain.RecommendNodeListResp, error) {
	var nodes []*domain.RecommendNodeListResp
	if err := r.db.WithContext(ctx).
		Model(&domain.KBReleaseNodeRelease{}).
		Joins("LEFT JOIN node_releases ON node_releases.id = kb_release_node_releases.node_release_id").
		Where("node_releases.kb_id = ?", kbID).
		Where("kb_release_node_releases.release_id = ?", releaseID).
		Where("node_releases.parent_id IN ?", parentIDs).
		Where("node_releases.type != ?", domain.NodeTypeFolder).
		Where("node_releases.visibility = ?", domain.NodeVisibilityPublic).
		Select("node_releases.node_id as id, node_releases.name, node_releases.type, node_releases.meta->>'summary' as summary, node_releases.meta->>'emoji' as emoji, node_releases.parent_id, node_releases.position").
		Find(&nodes).Error; err != nil {
		return nil, err
	}
	nodesMap := make(map[string][]*domain.RecommendNodeListResp)
	for _, node := range nodes {
		if _, ok := nodesMap[node.ParentID]; !ok {
			nodesMap[node.ParentID] = make([]*domain.RecommendNodeListResp, 0)
		}
		nodesMap[node.ParentID] = append(nodesMap[node.ParentID], node)
	}
	return nodesMap, nil
}

// GetNodeReleaseListByKBID get node list by kb id
func (r *NodeRepository) GetNodeReleaseListByKBID(ctx context.Context, kbID string) ([]*domain.ShareNodeListItemResp, error) {
	// get kb release
	var kbRelease *domain.KBRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.KBRelease{}).
		Where("kb_id = ?", kbID).
		Order("created_at DESC").
		First(&kbRelease).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	var nodes []*domain.ShareNodeListItemResp
	if err := r.db.WithContext(ctx).
		Model(&domain.KBReleaseNodeRelease{}).
		Joins("LEFT JOIN node_releases ON node_releases.id = kb_release_node_releases.node_release_id").
		Where("kb_release_node_releases.kb_id = ?", kbID).
		Where("kb_release_node_releases.release_id = ?", kbRelease.ID).
		Where("node_releases.visibility = ?", domain.NodeVisibilityPublic).
		Select("node_releases.node_id as id, node_releases.name, node_releases.type, node_releases.parent_id, node_releases.position, node_releases.meta->>'emoji' as emoji, node_releases.updated_at").
		Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}

func (r *NodeRepository) GetNodeReleaseDetailByKBIDAndID(ctx context.Context, kbID, id string) (*domain.NodeDetailResp, error) {
	// get kb release
	var kbRelease *domain.KBRelease
	if err := r.db.WithContext(ctx).
		Model(&domain.KBRelease{}).
		Where("kb_id = ?", kbID).
		Order("created_at DESC").
		First(&kbRelease).Error; err != nil {
		return nil, err
	}
	var node *domain.NodeDetailResp
	if err := r.db.WithContext(ctx).
		Model(&domain.KBReleaseNodeRelease{}).
		Joins("LEFT JOIN node_releases ON node_releases.id = kb_release_node_releases.node_release_id").
		Where("kb_release_node_releases.release_id = ?", kbRelease.ID).
		Where("node_releases.node_id = ?", id).
		Where("node_releases.kb_id = ?", kbID).
		Where("node_releases.visibility = ?", domain.NodeVisibilityPublic).
		Select("node_releases.*").
		First(&node).Error; err != nil {
		return nil, err
	}
	return node, nil
}

func (r *NodeRepository) MoveNodeBetween(ctx context.Context, id string, parentID string, prevID, nextID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var prevPos, maxPos float64 = 0, domain.MaxPosition
		if prevID != "" {
			var prevNode *domain.Node
			if err := tx.Model(&domain.Node{}).
				Where("id = ?", prevID).
				Where("parent_id = ?", parentID).
				Select("position, parent_id").
				First(&prevNode).Error; err != nil {
				return err
			}
			prevPos = prevNode.Position
		}
		if nextID != "" {
			var nextNode *domain.Node
			if err := tx.Model(&domain.Node{}).
				Where("id = ?", nextID).
				Where("parent_id = ?", parentID).
				Select("position, parent_id").
				First(&nextNode).Error; err != nil {
				return err
			}
			maxPos = nextNode.Position
		}

		node, err := r.GetNodeByID(ctx, id)
		if err != nil {
			return err
		}

		newPos := prevPos + (maxPos-prevPos)/2.0
		if newPos-prevPos < domain.MinPositionGap {
			if err := r.reorderPositionsByParentID(tx, node.KBID, parentID); err != nil {
				return err
			}
		}

		return tx.Model(&domain.Node{}).
			Where("id = ?", id).
			Update("position", newPos).
			Update("parent_id", parentID).
			Update("status", domain.NodeStatusDraft).
			Error
	})
}

// UpdateNodeDocID update node doc id
func (r *NodeRepository) UpdateNodeDocID(ctx context.Context, id, docID string) error {
	return r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Omit("updated_at").
		Where("id = ?", id).
		Updates(map[string]any{
			"doc_id": docID,
		}).Error
}

// UpdateNodeReleaseDocID update node release doc id
func (r *NodeRepository) UpdateNodeReleaseDocID(ctx context.Context, id, docID string) error {
	return r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Omit("updated_at").
		Where("id = ?", id).
		Updates(map[string]any{
			"doc_id": docID,
		}).Error
}

func (r *NodeRepository) UpdateNodeSummary(ctx context.Context, kbID, nodeID, summary string) error {
	return r.db.WithContext(ctx).
		Model(&domain.Node{}).
		Where("kb_id = ? AND id = ?", kbID, nodeID).
		Updates(map[string]any{
			"meta":   gorm.Expr("jsonb_set(meta, '{summary}', to_jsonb(?::text))", summary),
			"status": domain.NodeStatusDraft,
		}).Error
}

// traverse all nodes by pg cursor
func (r *NodeRepository) TraverseNodesByCursor(ctx context.Context, callback func(*domain.NodeRelease) error) error {
	rows, err := r.db.WithContext(ctx).
		Model(&domain.NodeRelease{}).
		Where("visibility = ?", domain.NodeVisibilityPublic).
		Select("DISTINCT ON (node_id) id, node_id, kb_id").
		Order("node_id, updated_at DESC").
		Rows()
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var nodeRelease domain.NodeRelease
		if err := r.db.ScanRows(rows, &nodeRelease); err != nil {
			return err
		}
		if err := callback(&nodeRelease); err != nil {
			return err
		}
	}

	if err := rows.Err(); err != nil {
		return err
	}

	return nil
}

// CreateNodeReleases create node releases
func (r *NodeRepository) CreateNodeReleases(ctx context.Context, kbID string, nodeIDs []string) ([]string, error) {
	releaseIDs := make([]string, 0)
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// update node status to published and return node ids
		var updatedNodes []*domain.Node
		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", kbID).
			Where("id IN ?", nodeIDs).
			Update("status", domain.NodeStatusReleased).
			Find(&updatedNodes).Error; err != nil {
			return err
		}
		if len(updatedNodes) == 0 {
			return nil
		}
		nodeReleases := make([]*domain.NodeRelease, len(updatedNodes))
		for i, updatedNode := range updatedNodes {
			// create node release
			nodeRelease := &domain.NodeRelease{
				ID:         uuid.New().String(),
				KBID:       kbID,
				NodeID:     updatedNode.ID,
				Type:       updatedNode.Type,
				Visibility: updatedNode.Visibility,
				Name:       updatedNode.Name,
				Meta:       updatedNode.Meta,
				Content:    updatedNode.Content,
				ParentID:   updatedNode.ParentID,
				Position:   updatedNode.Position,
				CreatedAt:  updatedNode.CreatedAt,
				UpdatedAt:  time.Now(),
			}
			nodeReleases[i] = nodeRelease
		}
		for _, nodeRelease := range nodeReleases {
			// return public node release ids
			if nodeRelease.Visibility == domain.NodeVisibilityPublic {
				releaseIDs = append(releaseIDs, nodeRelease.ID)
			}
		}
		if err := tx.CreateInBatches(&nodeReleases, 100).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return releaseIDs, nil
}

func (r *NodeRepository) GetOldNodeDocIDsByNodeID(ctx context.Context, nodeReleaseID, nodeID string) ([]string, error) {
	var docIDs []string
	if err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// get old doc_ids by node_id
		if err := tx.Model(&domain.NodeRelease{}).
			Where("node_id = ?", nodeID).
			Where("id != ?", nodeReleaseID).
			Where("doc_id != ''").
			Select("doc_id").
			Find(&docIDs).Error; err != nil {
			return err
		}
		// update node_release.doc_id to ""
		if err := tx.Model(&domain.NodeRelease{}).
			Where("node_id = ?", nodeID).
			Where("id != ?", nodeReleaseID).
			Omit("updated_at").
			Update("doc_id", "").Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return docIDs, nil
}

func (r *NodeRepository) BatchMove(ctx context.Context, req *domain.BatchMoveReq) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// update node parent_id
		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", req.KBID).
			Where("id IN ?", req.IDs).
			Update("parent_id", req.ParentID).
			Update("status", domain.NodeStatusDraft).
			Error; err != nil {
			return err
		}
		return nil
	})
}

// reorderPositionsByParentID 重排所给父节点下的所有子节点
func (r *NodeRepository) reorderPositionsByParentID(tx *gorm.DB, kbID, parentID string) error {
	var nodes []*domain.Node
	if parentID == "" {
		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", kbID).
			Where("parent_id IS NULL OR parent_id = ''").
			Order("position").
			Find(&nodes).Error; err != nil {
			return err
		}
	} else {
		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", kbID).
			Where("parent_id = ?", parentID).
			Order("position").
			Find(&nodes).Error; err != nil {
			return err
		}
	}
	return r.reorderPositions(tx, nodes)
}

// reorderPositions 重排所给节点
func (r *NodeRepository) reorderPositions(tx *gorm.DB, nodes []*domain.Node) error {
	if len(nodes) == 0 {
		return nil
	}

	basePosition := int64(1000) // 起始位置
	interval := int64(1000)     // 间隔

	updates := make([]map[string]interface{}, len(nodes))
	for i, node := range nodes {
		newPosition := float64(basePosition + int64(i)*interval)
		updates[i] = map[string]interface{}{
			"id":       node.ID,
			"position": newPosition,
		}
	}

	batchSize := 300
	for i := 0; i < len(updates); i += batchSize {
		end := i + batchSize
		if end > len(updates) {
			end = len(updates)
		}
		batch := updates[i:end]

		values := make([]string, 0, len(batch))
		for _, update := range batch {
			id := update["id"]
			pos := update["position"]
			values = append(values, fmt.Sprintf("('%v', %v)", id, pos))
		}

		sql := fmt.Sprintf("UPDATE nodes SET position = new_values.new_value FROM (VALUES %s) AS new_values(id, new_value) WHERE nodes.id = new_values.id", strings.Join(values, ", "))

		if err := tx.Exec(sql).Error; err != nil {
			return err
		}
	}

	return nil
}
