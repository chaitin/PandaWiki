package usecase

import (
	"context"
	"errors"
	"fmt"

	"github.com/samber/lo"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/s3"
)

type NodeUsecase struct {
	nodeRepo   *pg.NodeRepository
	ragRepo    *mq.RAGRepository
	kbRepo     *pg.KnowledgeBaseRepository
	modelRepo  *pg.ModelRepository
	llmUsecase *LLMUsecase
	logger     *log.Logger
	s3Client   *s3.MinioClient
}

func NewNodeUsecase(nodeRepo *pg.NodeRepository, ragRepo *mq.RAGRepository, kbRepo *pg.KnowledgeBaseRepository, llmUsecase *LLMUsecase, logger *log.Logger, s3Client *s3.MinioClient, modelRepo *pg.ModelRepository) *NodeUsecase {
	return &NodeUsecase{
		nodeRepo:   nodeRepo,
		ragRepo:    ragRepo,
		kbRepo:     kbRepo,
		llmUsecase: llmUsecase,
		modelRepo:  modelRepo,
		logger:     logger.WithModule("usecase.node"),
		s3Client:   s3Client,
	}
}

func (u *NodeUsecase) Create(ctx context.Context, req *domain.CreateNodeReq) (string, error) {
	nodeID, err := u.nodeRepo.Create(ctx, req)
	if err != nil {
		return "", err
	}
	return nodeID, nil
}

func (u *NodeUsecase) GetList(ctx context.Context, req *domain.GetNodeListReq) ([]*domain.NodeListItemResp, error) {
	nodes, err := u.nodeRepo.GetList(ctx, req)
	if err != nil {
		return nil, err
	}
	return nodes, nil
}

func (u *NodeUsecase) GetByID(ctx context.Context, id string) (*domain.NodeDetailResp, error) {
	return u.nodeRepo.GetByID(ctx, id)
}

func (u *NodeUsecase) NodeAction(ctx context.Context, req *domain.NodeActionReq) error {
	switch req.Action {
	case "delete":
		docIDs, err := u.nodeRepo.Delete(ctx, req.KBID, req.IDs)
		if err != nil {
			return err
		}
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, docID := range docIDs {
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:   req.KBID,
				DocID:  docID,
				Action: "delete",
			})
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
			return err
		}
	case "private":
		// update node visibility to private
		if err := u.nodeRepo.UpdateNodesVisibility(ctx, req.KBID, req.IDs, domain.NodeVisibilityPrivate); err != nil {
			return err
		}
		// get latest node release and delete in vector
		nodeReleases, err := u.nodeRepo.GetLatestNodeReleaseByNodeIDs(ctx, req.KBID, req.IDs)
		if err != nil {
			return fmt.Errorf("get latest node release failed: %w", err)
		}
		if len(nodeReleases) > 0 {
			nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
			for _, nodeRelease := range nodeReleases {
				if nodeRelease.DocID == "" {
					continue
				}
				nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
					KBID:   req.KBID,
					DocID:  nodeRelease.DocID,
					Action: "delete",
				})
			}
			if len(nodeVectorContentRequests) == 0 {
				return nil
			}
			if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
				return err
			}
		}
	case "public":
		// update node visibility to public
		if err := u.nodeRepo.UpdateNodesVisibility(ctx, req.KBID, req.IDs, domain.NodeVisibilityPublic); err != nil {
			return err
		}
	}
	return nil
}

func (u *NodeUsecase) Update(ctx context.Context, req *domain.UpdateNodeReq) error {
	err := u.nodeRepo.UpdateNodeContent(ctx, req)
	if err != nil {
		return err
	}
	if req.Visibility != nil && *req.Visibility == domain.NodeVisibilityPrivate {
		// get latest node release
		nodeRelease, err := u.nodeRepo.GetLatestNodeReleaseByNodeID(ctx, req.ID)
		if err != nil {
			return err
		}
		if nodeRelease.DocID != "" {
			if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, []*domain.NodeReleaseVectorRequest{
				{
					KBID:   req.KBID,
					DocID:  nodeRelease.DocID,
					Action: "delete",
				},
			}); err != nil {
				return err
			}
		}
	}
	return nil
}

func (u *NodeUsecase) GetNodeReleaseListByKBID(ctx context.Context, kbID string) ([]*domain.ShareNodeListItemResp, error) {
	return u.nodeRepo.GetNodeReleaseListByKBID(ctx, kbID)
}

func (u *NodeUsecase) GetNodeReleaseDetailByKBIDAndID(ctx context.Context, kbID, id string) (*domain.NodeDetailResp, error) {
	return u.nodeRepo.GetNodeReleaseDetailByKBIDAndID(ctx, kbID, id)
}

func (u *NodeUsecase) MoveNode(ctx context.Context, req *domain.MoveNodeReq) error {
	return u.nodeRepo.MoveNodeBetween(ctx, req.ID, req.ParentID, req.PrevID, req.NextID)
}

func (u *NodeUsecase) SummaryNode(ctx context.Context, req *domain.NodeSummaryReq) (string, error) {
	model, err := u.modelRepo.GetChatModel(ctx)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", domain.ErrModelNotConfigured
		}
		return "", err
	}
	if len(req.IDs) == 1 {
		node, err := u.nodeRepo.GetNodeByID(ctx, req.IDs[0])
		if err != nil {
			return "", fmt.Errorf("get latest node release failed: %w", err)
		}
		summary, err := u.llmUsecase.SummaryNode(ctx, model, node.Name, node.Content)
		if err != nil {
			return "", fmt.Errorf("summary node failed: %w", err)
		}
		return summary, nil
	} else {
		// async create node summary
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, id := range req.IDs {
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:   req.KBID,
				NodeID: id,
				Action: "summary",
			})
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
			return "", err
		}
	}
	return "", nil
}

func (u *NodeUsecase) GetRecommendNodeList(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error) {
	// get latest kb release
	kbRelease, err := u.kbRepo.GetLatestRelease(ctx, req.KBID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	nodes, err := u.nodeRepo.GetRecommendNodeListByIDs(ctx, req.KBID, kbRelease.ID, req.NodeIDs)
	if err != nil {
		return nil, err
	}
	if len(nodes) > 0 {
		// sort nodes by req.NodeIDs order
		nodesMap := lo.SliceToMap(nodes, func(item *domain.RecommendNodeListResp) (string, *domain.RecommendNodeListResp) {
			return item.ID, item
		})
		nodes = make([]*domain.RecommendNodeListResp, 0)
		for _, id := range req.NodeIDs {
			if node, ok := nodesMap[id]; ok {
				nodes = append(nodes, node)
			}
		}
		// get folder nodes
		folderNodeIds := lo.Filter(nodes, func(item *domain.RecommendNodeListResp, _ int) bool {
			return item.Type == domain.NodeTypeFolder
		})
		if len(folderNodeIds) > 0 {
			parentIDNodeMap, err := u.nodeRepo.GetRecommendNodeListByParentIDs(ctx, req.KBID, kbRelease.ID, lo.Map(folderNodeIds, func(item *domain.RecommendNodeListResp, _ int) string {
				return item.ID
			}))
			if err != nil {
				return nil, err
			}
			for _, node := range nodes {
				if parentNodes, ok := parentIDNodeMap[node.ID]; ok {
					node.RecommendNodes = parentNodes
				}
			}
		}
		return nodes, nil
	}
	return nil, nil
}

func (u *NodeUsecase) BatchMoveNode(ctx context.Context, req *domain.BatchMoveReq) error {
	return u.nodeRepo.BatchMove(ctx, req)
}

func (u *NodeUsecase) GetNodeReleaseListByKBIDNodeID(ctx context.Context, kbID, nodeID string) ([]*domain.NodeReleaseListItem, error) {
	nodeRelease, err := u.nodeRepo.GetNodeReleaseListByKBIDNodeID(ctx, kbID, nodeID)
	if err != nil {
		return nil, err
	}
	releaseIDs := lo.Map(nodeRelease, func(item *domain.NodeReleaseListItem, _ int) string {
		return item.ReleaseID
	})
	releaseIDMap, err := u.kbRepo.GetKBReleaseListByIDs(ctx, kbID, releaseIDs)
	if err != nil {
		return nil, err
	}
	nodeRelease = lo.Map(nodeRelease, func(item *domain.NodeReleaseListItem, _ int) *domain.NodeReleaseListItem {
		if release, ok := releaseIDMap[item.ReleaseID]; ok {
			item.ReleaseMessage = release.Message
			item.ReleaseTag = release.Tag
		}
		return item
	})
	return nodeRelease, nil
}

func (u *NodeUsecase) GetNodeReleaseDetailByID(ctx context.Context, id string) (*domain.GetNodeReleaseDetailResp, error) {
	return u.nodeRepo.GetNodeReleaseDetailByID(ctx, id)
}
