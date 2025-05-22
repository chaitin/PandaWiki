package mq

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/mq/types"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/vector"
	"github.com/chaitin/panda-wiki/store/vector/embedding"
)

type VectorMQHandler struct {
	consumer mq.MQConsumer
	logger   *log.Logger
	vector   vector.VectorStore
	docRepo  *pg.DocRepository
	config   *config.Config
}

func NewVectorMQHandler(consumer mq.MQConsumer, logger *log.Logger, vector vector.VectorStore, docRepo *pg.DocRepository, config *config.Config) (*VectorMQHandler, error) {
	h := &VectorMQHandler{
		consumer: consumer,
		logger:   logger.WithModule("mq.vector"),
		vector:   vector,
		docRepo:  docRepo,
		config:   config,
	}
	if err := consumer.RegisterHandler(domain.VectorTaskTopic, h.HandleDocVectorContentRequest); err != nil {
		return nil, err
	}
	return h, nil
}

func (h *VectorMQHandler) HandleDocVectorContentRequest(ctx context.Context, msg types.Message) error {
	var request domain.DocVectorContentRequest
	err := json.Unmarshal(msg.GetData(), &request)
	if err != nil {
		h.logger.Error("unmarshal doc vector content request failed", log.Error(err))
		return nil
	}
	switch request.Action {
	case "upsert":
		h.logger.Debug("upsert doc vector content request", "request", request)
		docIDContents, err := h.docRepo.GetDocContentByIDs(ctx, request.DocIDs)
		if err != nil {
			h.logger.Error("get doc vector content by ids failed", log.Error(err))
			return err
		}
		// delete old doc chunk records
		if err := h.vector.DeleteRecords(ctx, request.DocIDs); err != nil {
			h.logger.Error("delete doc vector content failed", log.Error(err))
			return err
		}
		docChunks := make([]*domain.DocChunk, 0)
		// split markdown to chunks
		for _, docContent := range docIDContents {
			chunks, err := embedding.SplitText(docContent.Content, 8192)
			if err != nil {
				h.logger.Error("split text failed", log.Error(err))
				return err
			}
			for i, chunk := range chunks {
				chunkURL := docContent.URL
				if docContent.Source == domain.DocSourceFile || docContent.Source == domain.DocSourceManual {
					chunkURL = fmt.Sprintf("%s/app/default/kb/%s/doc/%s", h.config.AppBaseURL, docContent.KBID, docContent.ID)
				}
				docChunks = append(docChunks, &domain.DocChunk{
					ID:      uuid.New().String(),
					KBID:    docContent.KBID,
					DocID:   docContent.ID,
					Seq:     uint(i),
					Content: chunk,
					URL:     chunkURL,
					Title:   docContent.Title,
				})
			}
		}
		if err := h.docRepo.CreateDocChunks(ctx, request.DocIDs, docChunks); err != nil {
			h.logger.Error("create doc chunks failed", log.Error(err))
			return err
		}
		// upsert doc chunks
		err = h.vector.UpsertRecords(ctx, docChunks)
		if err != nil {
			h.logger.Error("upsert doc vector content failed", log.Error(err))
			return err
		}
		updatedIDsMap, err := h.docRepo.UpdatekDocStatus(ctx, request.DocIDs, []domain.DocStatus{domain.DocStatusPending}, domain.DocStatusPublished)
		if err != nil {
			h.logger.Error("update doc status failed", log.Error(err))
			return err
		}
		h.logger.Info("update doc status success", log.Any("updated_ids", updatedIDsMap))

	case "delete":
		h.logger.Info("delete doc vector content request", log.Any("request", request))
		if err := h.vector.DeleteRecords(ctx, request.DocIDs); err != nil {
			h.logger.Error("delete doc vector content failed", log.Error(err))
			return err
		}
		h.logger.Info("delete doc vector content success", log.Any("doc_ids", request.DocIDs))
	}

	return nil
}
