package mq

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/mq/types"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/usecase"
)

type RAGMQHandler struct {
	consumer     mq.MQConsumer
	logger       *log.Logger
	rag          rag.RAGService
	nodeRepo     *pg.NodeRepository
	kbRepo       *pg.KnowledgeBaseRepository
	llmUsecase   *usecase.LLMUsecase
	modelUsecase *usecase.ModelUsecase
}

func NewRAGMQHandler(consumer mq.MQConsumer, logger *log.Logger, rag rag.RAGService, nodeRepo *pg.NodeRepository, kbRepo *pg.KnowledgeBaseRepository, llmUsecase *usecase.LLMUsecase, modelUsecase *usecase.ModelUsecase) (*RAGMQHandler, error) {
	h := &RAGMQHandler{
		consumer:     consumer,
		logger:       logger.WithModule("mq.rag"),
		rag:          rag,
		nodeRepo:     nodeRepo,
		kbRepo:       kbRepo,
		llmUsecase:   llmUsecase,
		modelUsecase: modelUsecase,
	}
	if err := consumer.RegisterHandler(domain.VectorTaskTopic, h.HandleNodeContentVectorRequest); err != nil {
		return nil, err
	}
	return h, nil
}

func (h *RAGMQHandler) HandleNodeContentVectorRequest(ctx context.Context, msg types.Message) error {
	var request domain.NodeReleaseVectorRequest
	err := json.Unmarshal(msg.GetData(), &request)
	if err != nil {
		h.logger.Error("unmarshal node content vector request failed", log.Error(err))
		return nil
	}
	// 这里的幂等判断是"先查后做"而不是原子 claim，是安全的：
	// 该 durable push consumer 同一时刻只允许一个订阅绑定，回调本身也是单协程串行执行，
	// 同一个幂等键不会在多实例间被并发处理。
	switch request.Action {
	case "update_group_ids":
		h.logger.Info("update node group request", log.Any("request", request), log.String("node_id", request.NodeID))
		if err := h.syncDocumentGroupIDs(ctx, request); err != nil {
			h.logger.Error("update node group failed", log.Error(err))
			return err
		}

	case "upsert":
		h.logger.Debug("upsert node content vector request", "request", request)
		nodeRelease, err := h.nodeRepo.GetNodeReleaseWithDirPathByID(ctx, request.NodeReleaseID)
		if err != nil {
			h.logger.Error("get node content by ids failed", log.Error(err))
			return nil
		}
		if nodeRelease.Type == domain.NodeTypeFolder {
			h.logger.Info("node is folder, skip upsert", log.Any("node_release_id", request.NodeReleaseID))
			return nil
		}
		isLatest, err := h.nodeRepo.IsLatestNodeRelease(ctx, nodeRelease.NodeID, nodeRelease.ID)
		if err != nil {
			h.logger.Error("check latest node release failed", log.String("node_id", nodeRelease.NodeID), log.Error(err))
			return err
		}
		if !isLatest {
			h.logger.Info("node release is superseded, skip upsert",
				log.String("node_id", nodeRelease.NodeID),
				log.String("node_release_id", nodeRelease.ID))
			return nil
		}
		if request.RequestID != "" && nodeRelease.Meta.LastVectorRequestID == request.RequestID {
			h.logger.Debug("vector request already processed, skip",
				log.String("node_release_id", request.NodeReleaseID),
				log.String("request_id", request.RequestID))
			return nil
		}
		// 幂等键由发布快照本身派生，而不是每批随机生成的 request_id。
		// 这样调用方重复发起同一逻辑操作时也能被拦截。
		dedupeKey := nodeReleaseVectorKey(nodeRelease.ID, nodeRelease.Content)
		if !request.Force && nodeRelease.Meta.LastVectorContentKey == dedupeKey {
			h.logger.Debug("upsert already processed, skip",
				log.Any("node_release_id", request.NodeReleaseID),
				log.String("dedupe_key", dedupeKey))
			return nil
		}
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err), log.String("kb_id", request.KBID))
			return err
		}

		groupIds, err := h.nodeRepo.GetNodeAuthGroupIdsByNodeId(ctx, nodeRelease.NodeID, consts.NodePermNameAnswerable)
		if err != nil {
			h.logger.Error("get groupIds failed", log.Error(err), log.String("kb_id", request.KBID))
			return err
		}

		// upsert node content chunks
		docID, err := h.rag.UpsertRecords(ctx, &rag.UpsertRecordsRequest{
			ID:        nodeRelease.ID,
			Title:     nodeRelease.Name,
			DatasetID: kb.DatasetID,
			DocID:     nodeRelease.DocID,
			Content:   nodeRelease.Content,
			GroupIDs:  groupIds,
		})
		if err != nil {
			h.logger.Error("upsert node content vector failed", log.Error(err))
			return err
		}
		// update node doc_id
		if err := h.nodeRepo.UpdateNodeReleaseDocID(ctx, request.NodeReleaseID, docID); err != nil {
			h.logger.Error("update node doc_id failed", log.String("node_id", request.NodeReleaseID), log.Error(err))
			return err
		}
		// delete old RAG records
		// get old doc_ids by node_id
		oldDocIDs, err := h.nodeRepo.GetOldNodeDocIDsByNodeID(ctx, nodeRelease.ID, nodeRelease.NodeID)
		if err != nil {
			h.logger.Error("get old doc_ids by node_id failed", log.String("node_id", nodeRelease.NodeID), log.Error(err))
			return err
		}
		if len(oldDocIDs) > 0 {
			// delete old RAG records
			if err := h.rag.DeleteRecords(ctx, kb.DatasetID, oldDocIDs); err != nil {
				h.logger.Error("delete old RAG records failed", log.String("kb_id", kb.ID), log.Error(err))
				return err
			}
		}
		if err := h.nodeRepo.UpdateNodeReleaseVectorState(ctx, request.NodeReleaseID, dedupeKey, request.RequestID); err != nil {
			h.logger.Error("update node release vector state failed", log.String("node_release_id", request.NodeReleaseID), log.Error(err))
			return err
		}

		h.logger.Info("upsert node content vector success",
			log.Any("updated_ids", request.NodeReleaseID),
			log.String("request_id", request.RequestID),
			log.String("dedupe_key", dedupeKey))
	case "delete":
		h.logger.Info("delete node content vector request", log.Any("request", request))
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err))
			return err
		}
		if err := h.rag.DeleteRecords(ctx, kb.DatasetID, []string{request.DocID}); err != nil {
			h.logger.Error("delete node content vector failed", log.Error(err))
			return err
		}
		h.logger.Info("delete node content vector success", log.Any("deleted_id", request.NodeReleaseID), log.Any("deleted_doc_id", request.DocID))
	case "summary":
		h.logger.Info("summary node content vector request", log.Any("request", request))
		node, err := h.nodeRepo.GetNodeByID(ctx, request.NodeID)
		if err != nil {
			h.logger.Error("get node by id failed", log.Error(err))
			return nil
		}
		if node.Type == domain.NodeTypeFolder {
			h.logger.Info("node is folder, skip summary", log.Any("node_id", request.NodeID))
			return nil
		}
		if request.RequestID != "" && node.Meta.LastSummaryRequestID == request.RequestID {
			h.logger.Debug("summary request already processed, skip",
				log.String("node_id", request.NodeID),
				log.String("request_id", request.RequestID))
			return nil
		}
		// 以节点当前内容作为幂等键：内容不变时重复消息直接跳过，内容变化后允许重新生成。
		dedupeKey := summaryContentKey(node)
		if !request.Force && node.Meta.LastSummaryContentKey == dedupeKey {
			h.logger.Debug("summary already processed, skip",
				log.Any("node_id", request.NodeID),
				log.String("dedupe_key", dedupeKey))
			return nil
		}

		model, err := h.modelUsecase.GetChatModel(ctx)
		if err != nil {
			h.logger.Error("get chat model failed", log.Error(err))
			return err
		}

		summary, err := h.llmUsecase.SummaryNode(ctx, request.KBID, model, node.Name, node.Content)
		if err != nil {
			h.logger.Error("summary node content failed", log.Error(err))
			return err
		}
		// 摘要内容、幂等标记和发布态回退在同一条 UPDATE 中完成，
		// 避免"标记已写入但状态未回退"时重试被幂等检查跳过。
		if err := h.nodeRepo.UpdateNodeSummary(ctx, request.KBID, request.NodeID, summary, dedupeKey, request.RequestID); err != nil {
			h.logger.Error("update node summary failed", log.Error(err))
			return err
		}

		h.logger.Info("summary node content vector success", log.Any("node_id", request.NodeID), log.Any("summary", summary))
	}

	return nil
}

// syncDocumentGroupIDs 在消费时读取当前权限，避免延迟重投的旧消息覆盖后续权限变更。
func (h *RAGMQHandler) syncDocumentGroupIDs(ctx context.Context, request domain.NodeReleaseVectorRequest) error {
	docID := request.DocID
	groupIDs := request.GroupIds
	nodeID := request.NodeID

	// 兼容升级前没有 NodeID 的消息：通过 doc_id 反查节点，再读取最新权限。
	if nodeID == "" && docID != "" {
		releases, err := h.nodeRepo.GetNodeReleasesByDocIDs(ctx, []string{docID})
		if err != nil {
			return fmt.Errorf("get node release by doc id failed: %w", err)
		}
		if release, ok := releases[docID]; ok {
			nodeID = release.NodeID
		}
	}

	if nodeID != "" {
		releases, err := h.nodeRepo.GetLatestNodeReleaseByNodeIDs(ctx, request.KBID, []string{nodeID})
		if err != nil {
			return fmt.Errorf("get latest node release failed: %w", err)
		}
		if len(releases) == 0 {
			h.logger.Info("node has no release, skip group update", log.String("node_id", nodeID))
			return nil
		}
		// 最新快照可能尚未完成索引。此时仍要更新请求中旧文档的权限，
		// 避免新快照索引失败后旧文档继续保留过期权限。
		docID = groupUpdateDocID(releases[0].DocID, request.DocID)
		if releases[0].DocID == "" {
			h.logger.Info("latest node release is not indexed, fallback to requested document",
				log.String("node_id", nodeID),
				log.String("doc_id", docID))
		}
		groupIDs, err = h.nodeRepo.GetNodeAuthGroupIdsByNodeId(ctx, nodeID, consts.NodePermNameAnswerable)
		if err != nil {
			return fmt.Errorf("get current node group ids failed: %w", err)
		}
	}

	if docID == "" {
		h.logger.Info("group update has no document id, skip", log.Any("request", request))
		return nil
	}
	kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
	if err != nil {
		return fmt.Errorf("get kb failed: %w", err)
	}
	if err := h.rag.UpdateDocumentGroupIDs(ctx, kb.DatasetID, docID, groupIDs); err != nil {
		return fmt.Errorf("update document group ids failed: %w", err)
	}
	h.logger.Info("update node group success", log.String("doc_id", docID), log.Any("group_ids", groupIDs))
	return nil
}

func groupUpdateDocID(latestDocID, requestedDocID string) string {
	if latestDocID != "" {
		return latestDocID
	}
	return requestedDocID
}

// nodeReleaseVectorKey 返回发布快照的确定性幂等键。
// 快照内容不可变，因此同一 release 无论被重复投递多少次都只会成功索引一次。
func nodeReleaseVectorKey(nodeReleaseID, content string) string {
	sum := sha256.Sum256([]byte(nodeReleaseID + ":" + content))
	return fmt.Sprintf("upsert:%x", sum)
}

// summaryContentKey 以节点当前内容作为幂等键，内容变化后允许重新生成摘要。
func summaryContentKey(node *domain.Node) string {
	sum := sha256.Sum256([]byte(node.ID + ":" + node.Content))
	return fmt.Sprintf("summary:%x", sum)
}
