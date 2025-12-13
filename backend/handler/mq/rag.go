package mq

import (
	"context"
	"encoding/json"

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
	switch request.Action {
	case "update_group_ids":
		h.logger.Info("update node group request", log.Any("request", request), log.Any("group_id", request.GroupIds))
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err))
			return nil
		}
		if err := h.rag.UpdateDocumentGroupIDs(ctx, kb.DatasetID, request.DocID, request.GroupIds); err != nil {
			h.logger.Error("update node group failed", log.Error(err))
			return nil
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
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err), log.String("kb_id", request.KBID))
			return nil
		}

		groupIds, err := h.nodeRepo.GetNodeAuthGroupIdsByNodeId(ctx, nodeRelease.NodeID, consts.NodePermNameAnswerable)
		if err != nil {
			h.logger.Error("get groupIds failed", log.Error(err), log.String("kb_id", request.KBID))
			return nil
		}

		// upsert node content chunks
		docID, err := h.rag.UpsertRecords(ctx, &rag.UpsertRecordsRequest{
			ID:        nodeRelease.ID,
			DatasetID: kb.DatasetID,
			DocID:     nodeRelease.DocID,
			Content:   nodeRelease.Content,
			GroupIDs:  groupIds,
		})
		if err != nil {
			h.logger.Error("upsert node content vector failed", log.Error(err))
			return nil
		}
		// update node doc_id
		if err := h.nodeRepo.UpdateNodeReleaseDocID(ctx, request.NodeReleaseID, docID); err != nil {
			h.logger.Error("update node doc_id failed", log.String("node_id", request.NodeReleaseID), log.Error(err))
			return nil
		}
		// delete old RAG records
		// get old doc_ids by node_id
		oldDocIDs, err := h.nodeRepo.GetOldNodeDocIDsByNodeID(ctx, nodeRelease.ID, nodeRelease.NodeID)
		if err != nil {
			h.logger.Error("get old doc_ids by node_id failed", log.String("node_id", nodeRelease.NodeID), log.Error(err))
			return nil
		}
		if len(oldDocIDs) > 0 {
			// delete old RAG records
			if err := h.rag.DeleteRecords(ctx, kb.DatasetID, oldDocIDs); err != nil {
				h.logger.Error("delete old RAG records failed", log.String("kb_id", kb.ID), log.Error(err))
				return nil
			}
		}

		h.logger.Info("upsert node content vector success", log.Any("updated_ids", request.NodeReleaseID))
	case "delete":
		h.logger.Info("delete node content vector request", log.Any("request", request))
		kb, err := h.kbRepo.GetKnowledgeBaseByID(ctx, request.KBID)
		if err != nil {
			h.logger.Error("get kb failed", log.Error(err))
			return nil
		}
		if err := h.rag.DeleteRecords(ctx, kb.DatasetID, []string{request.DocID}); err != nil {
			h.logger.Error("delete node content vector failed", log.Error(err))
			return nil
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

		model, err := h.modelUsecase.GetChatModel(ctx)
		if err != nil {
			h.logger.Error("get chat model failed", log.Error(err))
			return nil
		}

		summary, err := h.llmUsecase.SummaryNode(ctx, model, node.Name, node.Content)
		if err != nil {
			h.logger.Error("summary node content failed", log.Error(err))
			return nil
		}
		if err := h.nodeRepo.UpdateNodeSummary(ctx, request.KBID, request.NodeID, summary); err != nil {
			h.logger.Error("update node summary failed", log.Error(err))
			return nil
		}
		h.logger.Info("summary node content vector success", log.Any("summary_id", request.NodeReleaseID), log.Any("summary", summary))
	}

	return nil
}
