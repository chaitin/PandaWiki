package usecase

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/gomarkdown/markdown"
	"github.com/gomarkdown/markdown/html"
	"github.com/gomarkdown/markdown/parser"
	"github.com/microcosm-cc/bluemonday"
	"github.com/samber/lo"
	"gorm.io/gorm"

	v1 "github.com/chaitin/panda-wiki/api/node/v1"
	shareV1 "github.com/chaitin/panda-wiki/api/share/v1"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type NodeUsecase struct {
	nodeRepo   *pg.NodeRepository
	appRepo    *pg.AppRepository
	ragRepo    *mq.RAGRepository
	kbRepo     *pg.KnowledgeBaseRepository
	modelRepo  *pg.ModelRepository
	userRepo   *pg.UserRepository
	authRepo   *pg.AuthRepo
	llmUsecase *LLMUsecase
	logger     *log.Logger
	s3Client   *s3.MinioClient
	rAGService rag.RAGService
}

func NewNodeUsecase(
	nodeRepo *pg.NodeRepository,
	appRepo *pg.AppRepository,
	ragRepo *mq.RAGRepository,
	userRepo *pg.UserRepository,
	kbRepo *pg.KnowledgeBaseRepository,
	llmUsecase *LLMUsecase,
	ragService rag.RAGService,
	logger *log.Logger,
	s3Client *s3.MinioClient,
	modelRepo *pg.ModelRepository,
	authRepo *pg.AuthRepo,
) *NodeUsecase {
	return &NodeUsecase{
		nodeRepo:   nodeRepo,
		rAGService: ragService,
		appRepo:    appRepo,
		ragRepo:    ragRepo,
		kbRepo:     kbRepo,
		authRepo:   authRepo,
		userRepo:   userRepo,
		llmUsecase: llmUsecase,
		modelRepo:  modelRepo,
		logger:     logger.WithModule("usecase.node"),
		s3Client:   s3Client,
	}
}

const ragSyncChunkSize = 100

func (u *NodeUsecase) Create(ctx context.Context, req *domain.CreateNodeReq, userId string) (string, error) {
	nodeID, err := u.nodeRepo.Create(ctx, req, userId)
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

func (u *NodeUsecase) GetNodeByKBID(ctx context.Context, id, kbId, format string) (*v1.NodeDetailResp, error) {
	node, err := u.nodeRepo.GetByID(ctx, id, kbId)
	if err != nil {
		return nil, err
	}

	nodeRelease, err := u.nodeRepo.GetLatestNodeReleaseWithPublishAccount(ctx, node.ID)
	if err != nil {
		return nil, err
	}
	if nodeRelease != nil {
		node.PublisherId = nodeRelease.PublisherId
		node.PublisherAccount = nodeRelease.PublisherAccount
	}

	if node.Meta.ContentType == domain.ContentTypeMD {
		return node, nil
	}
	if format != "raw" {
		if !utils.IsLikelyHTML(node.Content) {
			node.Content = u.convertMDToHTML(node.Content)
		}
	}
	return node, nil
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
	}
	return nil
}

func (u *NodeUsecase) Update(ctx context.Context, req *domain.UpdateNodeReq, userId string) error {
	err := u.nodeRepo.UpdateNodeContent(ctx, req, userId)
	if err != nil {
		return err
	}
	return nil
}

func (u *NodeUsecase) ValidateNodePerm(ctx context.Context, kbID, nodeId string, authId uint) *domain.PWResponseErrCode {
	node, err := u.nodeRepo.GetNodeReleaseDetailByKBIDAndID(ctx, kbID, nodeId)
	if err != nil {
		return &domain.ErrCodeNotFound
	}
	switch node.Permissions.Visitable {
	case consts.NodeAccessPermOpen:
		return nil
	case consts.NodeAccessPermClosed:
		return &domain.ErrCodePermissionDenied
	case consts.NodeAccessPermPartial:
		authGroups, err := u.authRepo.GetAuthGroupWithParentsByAuthId(ctx, authId)
		if err != nil {
			return &domain.ErrCodeInternalError
		}

		authGroupIds := lo.Map(authGroups, func(v domain.AuthGroup, i int) uint {
			return v.ID
		})

		nodeGroupIds := make([]string, 0)
		if len(authGroupIds) != 0 {
			nodeGroups, err := u.nodeRepo.GetNodeGroupsByGroupIdsPerm(ctx, authGroupIds, consts.NodePermNameVisitable)
			if err != nil {
				return &domain.ErrCodeInternalError
			}

			nodeGroupIds = lo.Map(nodeGroups, func(v domain.NodeAuthGroup, i int) string {
				return v.NodeID
			})
		}
		if !slices.Contains(nodeGroupIds, nodeId) {
			u.logger.Error("ValidateNodePerm failed", log.Any("node_group_ids", nodeGroupIds), log.Any("node_id", nodeId))
			return &domain.ErrCodePermissionDenied
		}
	default:
		return &domain.ErrCodeInternalError
	}
	return nil
}

func (u *NodeUsecase) GetNodeReleaseDetailByKBIDAndID(ctx context.Context, kbID, nodeId, format string) (*shareV1.ShareNodeDetailResp, error) {
	node, err := u.nodeRepo.GetNodeReleaseDetailByKBIDAndID(ctx, kbID, nodeId)
	if err != nil {
		return nil, err
	}

	userMap, err := u.userRepo.GetUsersAccountMap(ctx)
	if err != nil {
		return nil, err
	}
	if account, ok := userMap[node.CreatorId]; ok {
		node.CreatorAccount = account
	}
	if account, ok := userMap[node.EditorId]; ok {
		node.EditorAccount = account
	}
	if account, ok := userMap[node.PublisherId]; ok {
		node.PublisherAccount = account
	}

	if node.Meta.ContentType == domain.ContentTypeMD {
		return node, nil
	}
	// just for info
	if format != "raw" {
		if !utils.IsLikelyHTML(node.Content) {
			node.Content = u.convertMDToHTML(node.Content)
		}
	}
	return node, nil
}

func (u *NodeUsecase) MoveNode(ctx context.Context, req *domain.MoveNodeReq) error {
	return u.nodeRepo.MoveNodeBetween(ctx, req.ID, req.ParentID, req.PrevID, req.NextID, req.KbID)
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

func (u *NodeUsecase) convertMDToHTML(mdStr string) string {
	extensions := parser.CommonExtensions & ^parser.Autolink & ^parser.MathJax
	p := parser.NewWithExtensions(extensions)
	doc := p.Parse([]byte(mdStr))

	// create HTML renderer with extensions
	htmlFlags := html.CommonFlags | html.HrefTargetBlank
	opts := html.RendererOptions{Flags: htmlFlags}
	renderer := html.NewRenderer(opts)

	maybeUnsafeHTML := markdown.Render(doc, renderer)
	html := bluemonday.UGCPolicy().SanitizeBytes(maybeUnsafeHTML)
	return string(html)
}

func (u *NodeUsecase) GetNodeReleaseListByKBID(ctx context.Context, kbID string, authId uint) ([]*domain.ShareNodeListItemResp, error) {

	nodes, err := u.nodeRepo.GetNodeReleaseListByKBID(ctx, kbID)
	if err != nil {
		return nil, err
	}

	nodeGroupIds, err := u.GetNodeIdsByAuthId(ctx, authId, consts.NodePermNameVisible)
	if err != nil {
		return nil, err
	}

	items := make([]*domain.ShareNodeListItemResp, 0)

	for i, node := range nodes {
		switch node.Permissions.Visible {
		case consts.NodeAccessPermOpen:
			items = append(items, nodes[i])
		case consts.NodeAccessPermPartial:
			if slices.Contains(nodeGroupIds, node.ID) {
				items = append(items, nodes[i])
			}
		}
	}

	return items, nil
}

func (u *NodeUsecase) GetNodeIdsByAuthId(ctx context.Context, authId uint, PermName consts.NodePermName) ([]string, error) {
	authGroups, err := u.authRepo.GetAuthGroupWithParentsByAuthId(ctx, authId)
	if err != nil {
		return nil, err
	}

	authGroupIds := lo.Map(authGroups, func(v domain.AuthGroup, i int) uint {
		return v.ID
	})

	nodeGroupIds := make([]string, 0)
	if len(authGroupIds) != 0 {
		nodeGroups, err := u.nodeRepo.GetNodeGroupsByGroupIdsPerm(ctx, authGroupIds, PermName)
		if err != nil {
			return nil, err
		}

		nodeGroupIds = lo.Map(nodeGroups, func(v domain.NodeAuthGroup, i int) string {
			return v.NodeID
		})
	}

	return nodeGroupIds, nil
}
func (u *NodeUsecase) GetNodePermissionsByID(ctx context.Context, id, kbID string) (*v1.NodePermissionResp, error) {
	node, err := u.nodeRepo.GetByID(ctx, id, kbID)
	if err != nil {
		return nil, err
	}
	resp := &v1.NodePermissionResp{
		ID:               node.ID,
		Permissions:      node.Permissions,
		AnswerableGroups: make([]domain.NodeGroupDetail, 0),
		VisitableGroups:  make([]domain.NodeGroupDetail, 0),
		VisibleGroups:    make([]domain.NodeGroupDetail, 0),
	}

	nodeGroupList, err := u.nodeRepo.GetNodeGroupByNodeId(ctx, node.ID)
	if err != nil {
		return nil, err
	}

	for i, nodeGroup := range nodeGroupList {
		switch nodeGroup.Perm {
		case consts.NodePermNameAnswerable:
			resp.AnswerableGroups = append(resp.AnswerableGroups, nodeGroupList[i])
		case consts.NodePermNameVisitable:
			resp.VisitableGroups = append(resp.VisitableGroups, nodeGroupList[i])
		case consts.NodePermNameVisible:
			resp.VisibleGroups = append(resp.VisibleGroups, nodeGroupList[i])
		}
	}

	return resp, err
}

func (u *NodeUsecase) ValidateNodePermissionsEdit(req v1.NodePermissionEditReq, edition consts.LicenseEdition) error {
	if edition != consts.LicenseEditionEnterprise {
		if req.Permissions.Answerable == consts.NodeAccessPermPartial || req.Permissions.Visitable == consts.NodeAccessPermPartial || req.Permissions.Visible == consts.NodeAccessPermPartial {
			return domain.ErrPermissionDenied
		}
		if req.AnswerableGroups != nil || req.VisitableGroups != nil || req.VisibleGroups != nil {
			return domain.ErrPermissionDenied
		}
	}
	return nil
}

func (u *NodeUsecase) NodePermissionsEdit(ctx context.Context, req v1.NodePermissionEditReq) error {
	if req.Permissions != nil {
		updateMap := map[string]interface{}{
			"permissions": req.Permissions,
		}

		if err := u.nodeRepo.UpdateNodesByKbID(ctx, req.IDs, req.KbId, updateMap); err != nil {
			return err
		}
	}

	nodeReleases, err := u.nodeRepo.GetLatestNodeReleaseByNodeIDs(ctx, req.KbId, req.IDs)
	if err != nil {
		return fmt.Errorf("get latest node release failed: %w", err)
	}

	if len(nodeReleases) > 0 {
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)

		var groupIds []int
		switch req.Permissions.Answerable {
		case consts.NodeAccessPermOpen:
			groupIds = nil
		case consts.NodeAccessPermPartial:
			groupIds = *req.AnswerableGroups
		case consts.NodeAccessPermClosed:
			groupIds = make([]int, 0)
		}
		for _, nodeRelease := range nodeReleases {
			if nodeRelease.DocID == "" {
				continue
			}
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:     req.KbId,
				DocID:    nodeRelease.DocID,
				Action:   "update_group_ids",
				GroupIds: groupIds,
			})
		}

		if len(nodeVectorContentRequests) != 0 {
			if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
				return err
			}
		}
	}

	if req.AnswerableGroups != nil {
		if err := u.nodeRepo.UpdateNodeGroupByKbIDAndNodeIds(ctx, req.IDs, *req.AnswerableGroups, consts.NodePermNameAnswerable); err != nil {
			return err
		}
	}

	if req.VisibleGroups != nil {
		if err := u.nodeRepo.UpdateNodeGroupByKbIDAndNodeIds(ctx, req.IDs, *req.VisibleGroups, consts.NodePermNameVisible); err != nil {
			return err
		}
	}

	if req.VisitableGroups != nil {
		if err := u.nodeRepo.UpdateNodeGroupByKbIDAndNodeIds(ctx, req.IDs, *req.VisitableGroups, consts.NodePermNameVisitable); err != nil {
			return err
		}
	}

	return nil
}

func (u *NodeUsecase) SyncRagNodeStatus(ctx context.Context) error {
	kbs, err := u.kbRepo.GetKnowledgeBaseList(ctx)
	if err != nil {
		return err
	}
	for _, kb := range kbs {
		docIds, err := u.nodeRepo.GetNodeIdsWithoutStatusByKbId(ctx, kb.ID)
		if err != nil {
			u.logger.Error("get node ids without status failed",
				log.String("kb_id", kb.ID),
				log.Error(err))
			continue
		}
		if len(docIds) == 0 {
			continue
		}

		chunks := lo.Chunk(docIds, ragSyncChunkSize)
		for _, chunk := range chunks {
			docs, err := u.rAGService.ListDocuments(ctx, kb.DatasetID, map[string]string{
				"ids": strings.Join(chunk, ","),
			})
			if err != nil {
				u.logger.Error("list documents from RAG failed",
					log.String("kb_id", kb.ID),
					log.String("dataset_id", kb.DatasetID),
					log.Error(err))
				continue
			}

			if len(docs) == 0 {
				continue
			}

			docToNodeMap, err := u.nodeRepo.GetNodeIdsByDocIds(ctx, chunk)
			if err != nil {
				u.logger.Error("get node ids by doc ids failed",
					log.String("kb_id", kb.ID),
					log.Error(err))
				continue
			}

			type StatusInfo struct {
				status  string
				message string
			}
			statusGroups := make(map[StatusInfo][]string) // status+message -> []nodeIDs

			for _, doc := range docs {
				nodeID, exists := docToNodeMap[doc.ID]
				if !exists {
					u.logger.Warn("doc_id not found in node_releases",
						log.String("doc_id", doc.ID))
					continue
				}

				statusKey := StatusInfo{
					status:  doc.Status,
					message: doc.ProgressMsg,
				}
				statusGroups[statusKey] = append(statusGroups[statusKey], nodeID)
			}

			for statusInfo, nodeIDs := range statusGroups {
				updateMap := map[string]interface{}{
					"rag_info": domain.RagInfo{
						Status:  consts.NodeRagInfoStatus(statusInfo.status),
						Message: statusInfo.message,
					},
				}

				if err := u.nodeRepo.UpdateNodesByKbID(ctx, nodeIDs, kb.ID, updateMap); err != nil {
					u.logger.Error("batch update node rag status failed",
						log.String("kb_id", kb.ID),
						log.Int("node_count", len(nodeIDs)),
						log.String("status", statusInfo.status),
						log.Error(err))
					continue
				}

				u.logger.Debug("batch updated node rag status",
					log.String("kb_id", kb.ID),
					log.Int("node_count", len(nodeIDs)),
					log.String("status", statusInfo.status))
			}
		}
	}

	return nil
}
