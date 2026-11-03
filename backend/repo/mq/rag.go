package mq

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/google/uuid"
)

type RAGRepository struct {
	producer mq.MQProducer
}

func NewRAGRepository(producer mq.MQProducer) *RAGRepository {
	return &RAGRepository{producer: producer}
}

func (r *RAGRepository) AsyncUpdateNodeReleaseVector(ctx context.Context, request []*domain.NodeReleaseVectorRequest) error {
	requestID := uuid.NewString()
	for _, req := range request {
		if req.RequestID == "" {
			req.RequestID = requestID
		}
		requestBytes, err := json.Marshal(req)
		if err != nil {
			return err
		}
		// 用完整请求内容生成消息 ID：update_group_ids 等请求不会因为字段缺失而互相覆盖，
		// 完全相同的请求在 JetStream 去重窗口内也只会入队一次。
		messageID := fmt.Sprintf("%x", sha256.Sum256(requestBytes))
		if err := r.producer.Produce(ctx, domain.VectorTaskTopic, messageID, requestBytes); err != nil {
			return err
		}
	}
	return nil
}
