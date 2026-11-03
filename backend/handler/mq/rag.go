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
		h.logger.Info("update node group request", log.Any("request", request), log.Any("group_id", request.GroupIds))
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err))
			return err
		}
		if err := h.rag.UpdateDocumentGroupIDs(ctx, kb.DatasetID, request.DocID, request.GroupIds); err != nil {
			h.logger.Error("update node group failed", log.Error(err))
			return err
		}
		h.logger.Info("update node group success", log.Any("doc_id", request.DocID), log.Any("group_ids", request.GroupIds))

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
		// 幂等键由发布快照本身派生，而不是每批随机生成的 request_id。
		// 这样调用方重复发起同一逻辑操作时也能被拦截。
		dedupeKey := nodeReleaseVectorKey(nodeRelease.ID, nodeRelease.Content)
		if !request.Force && nodeRelease.Meta.LastVectorRequestID == dedupeKey {
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
		if err := h.nodeRepo.UpdateNodeReleaseVectorRequestID(ctx, request.NodeReleaseID, dedupeKey); err != nil {
			h.logger.Error("update node release vector request id failed", log.String("node_release_id", request.NodeReleaseID), log.Error(err))
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
		// 以节点当前内容作为幂等键：内容不变时重复消息直接跳过，内容变化后允许重新生成。
		dedupeKey := summaryContentKey(node)
		if !request.Force && node.Meta.LastSummaryRequestID == dedupeKey {
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
		if err := h.nodeRepo.UpdateNodeSummary(ctx, request.KBID, request.NodeID, summary, dedupeKey); err != nil {
			h.logger.Error("update node summary failed", log.Error(err))
			return err
		}

		h.logger.Info("summary node content vector success", log.Any("node_id", request.NodeID), log.Any("summary", summary))
	}

	return nil
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
