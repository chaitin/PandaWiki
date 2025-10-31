package mq

import (
	"context"
	"encoding/json"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/mq/types"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type RagDocUpdateHandler struct {
	consumer mq.MQConsumer
	logger   *log.Logger
	nodeRepo *pg.NodeRepository
}

func NewRagDocUpdateHandler(consumer mq.MQConsumer, logger *log.Logger, nodeRepo *pg.NodeRepository) (*RagDocUpdateHandler, error) {
	h := &RagDocUpdateHandler{
		consumer: consumer,
		logger:   logger.WithModule("mq.rag_doc_update"),
		nodeRepo: nodeRepo,
	}
	if err := consumer.RegisterHandler(domain.RagDocUpdateTopic, h.HandleRagDocUpdate); err != nil {
		return nil, err
	}
	return h, nil
}

func (h *RagDocUpdateHandler) HandleRagDocUpdate(ctx context.Context, msg types.Message) error {
	var event domain.RagDocInfoUpdateEvent
	err := json.Unmarshal(msg.GetData(), &event)
	if err != nil {
		h.logger.Error("unmarshal rag doc update event failed", log.Error(err))
		return err
	}

	h.logger.Info("received rag doc update event",
		log.String("doc_id", event.ID),
		log.String("status", event.Status),
		log.String("message", event.Message))

	nodeId, err := h.nodeRepo.GetNodeIdByDocId(ctx, event.ID)
	if err != nil {
		h.logger.Error("failed to get node id by doc id",
			log.String("doc_id", event.ID),
			log.Error(err))
		return err
	}

	if err := h.nodeRepo.Update(ctx, nodeId, map[string]interface{}{
		"rag_status":  event.Status,
		"rag_message": event.Message,
	}); err != nil {
		return err
	}

	h.logger.Debug("node rag update success", log.String("doc_id", event.ID))
	return nil
}
