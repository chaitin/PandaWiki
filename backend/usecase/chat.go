package usecase

import (
	"context"
	"time"

	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type ChatUsecase struct {
	llmUsecase          *LLMUsecase
	conversationUsecase *ConversationUsecase
	modelUsecase        *ModelUsecase
	appRepo             *pg.AppRepository
	logger              *log.Logger
}

func NewChatUsecase(llmUsecase *LLMUsecase, conversationUsecase *ConversationUsecase, modelUsecase *ModelUsecase, appRepo *pg.AppRepository, logger *log.Logger) *ChatUsecase {
	u := &ChatUsecase{
		llmUsecase:          llmUsecase,
		conversationUsecase: conversationUsecase,
		modelUsecase:        modelUsecase,
		appRepo:             appRepo,
		logger:              logger.WithModule("usecase.chat"),
	}
	return u
}

func (u *ChatUsecase) Chat(ctx context.Context, req *domain.ChatRequest) (<-chan domain.SSEEvent, error) {
	eventCh := make(chan domain.SSEEvent, 100)
	go func() {
		defer close(eventCh)
		// 1. get app detail and validate app
		app, err := u.appRepo.GetOrCreateAppByKBIDAndType(ctx, req.KBID, req.AppType)
		if err != nil {
			eventCh <- domain.SSEEvent{Type: "error", Content: "app not found"}
			return
		}
		req.KBID = app.KBID
		req.AppID = app.ID
		req.AppType = app.Type
		// 2. get model and validate model
		model, err := u.modelUsecase.GetChatModel(ctx)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				eventCh <- domain.SSEEvent{Type: "error", Content: "请前往管理后台，点击右上角的“系统设置”配置推理大模型。"}
			} else {
				eventCh <- domain.SSEEvent{Type: "error", Content: "模型获取失败"}
			}
			return
		}
		req.ModelInfo = model
		// 3. conversation management
		if req.ConversationID == "" {
			id, err := uuid.NewV7()
			if err != nil {
				u.logger.Error("failed to generate conversation uuid", log.Error(err))
				id = uuid.New()
			}
			conversationID := id.String()
			req.ConversationID = conversationID
			nonce := uuid.New().String()
			eventCh <- domain.SSEEvent{Type: "conversation_id", Content: conversationID}
			eventCh <- domain.SSEEvent{Type: "nonce", Content: nonce}
			err = u.conversationUsecase.CreateConversation(ctx, &domain.Conversation{
				ID:        conversationID,
				Nonce:     nonce,
				AppID:     req.AppID,
				KBID:      req.KBID,
				Subject:   req.Message,
				RemoteIP:  req.RemoteIP,
				Info:      req.Info,
				CreatedAt: time.Now(),
			})
			if err != nil {
				u.logger.Error("failed to create chat conversation", log.Error(err))
				eventCh <- domain.SSEEvent{Type: "error", Content: "failed to create chat conversation"}
				return
			}
		} else {
			if req.Nonce == "" {
				eventCh <- domain.SSEEvent{Type: "error", Content: "nonce is required"}
				return
			}
			err := u.conversationUsecase.ValidateConversationNonce(ctx, req.ConversationID, req.Nonce)
			if err != nil {
				u.logger.Error("failed to validate chat conversation nonce", log.Error(err))
				eventCh <- domain.SSEEvent{Type: "error", Content: "validate chat conversation nonce failed"}
				return
			}
		}

		messageId := uuid.New().String()
		eventCh <- domain.SSEEvent{Type: "message_id", Content: messageId}
		userMessageId := uuid.New().String()
		// save user question to conversation message
		if err := u.conversationUsecase.CreateChatConversationMessage(ctx, req.KBID, &domain.ConversationMessage{
			ID:             userMessageId,
			ConversationID: req.ConversationID,
			KBID:           req.KBID,
			AppID:          req.AppID,
			Role:           schema.User,
			Content:        req.Message,
			RemoteIP:       req.RemoteIP,
		}); err != nil {
			u.logger.Error("failed to save user question to conversation message", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to save user question to conversation message"}
			return
		}
		// 4. retrieve documents and format prompt
		messages, rankedNodes, err := u.llmUsecase.FormatConversationMessages(ctx, req.ConversationID, req.KBID)
		if err != nil {
			u.logger.Error("failed to format chat messages", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to format chat messages"}
			return
		}
		for _, node := range rankedNodes {
			chunkResult := domain.NodeContentChunkSSE{
				NodeID:  node.NodeID,
				Name:    node.NodeName,
				Summary: node.NodeSummary,
			}
			eventCh <- domain.SSEEvent{Type: "chunk_result", ChunkResult: &chunkResult}
		}
		// 5. LLM inference (streaming callback), message storage, token statistics
		answer := ""
		usage := schema.TokenUsage{}
		chatModel, err := u.llmUsecase.GetChatModel(ctx, req.ModelInfo)
		if err != nil {
			u.logger.Error("failed to get chat model", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get chat model"}
			return
		}
		chatErr := u.llmUsecase.ChatWithAgent(ctx, chatModel, messages, &usage, func(ctx context.Context, dataType, chunk string) error {
			answer += chunk
			eventCh <- domain.SSEEvent{Type: dataType, Content: chunk}
			return nil
		})
		// save assistant answer to conversation message

		if err := u.conversationUsecase.CreateChatConversationMessage(ctx, req.KBID, &domain.ConversationMessage{
			ID:               messageId,
			ConversationID:   req.ConversationID,
			KBID:             req.KBID,
			AppID:            req.AppID,
			Role:             schema.Assistant,
			Content:          answer,
			Provider:         req.ModelInfo.Provider,
			Model:            string(req.ModelInfo.Model),
			PromptTokens:     usage.PromptTokens,
			CompletionTokens: usage.CompletionTokens,
			TotalTokens:      usage.TotalTokens,
			RemoteIP:         req.RemoteIP,
			ParentID:         userMessageId,
		}); err != nil {
			u.logger.Error("failed to save assistant answer to conversation message", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to save assistant answer to conversation message"}
			return
		}
		// update model usage
		if err := u.modelUsecase.UpdateUsage(ctx, req.ModelInfo.ID, &usage); err != nil {
			u.logger.Error("failed to update model usage", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to update model usage"}
			return
		}

		if chatErr != nil {
			u.logger.Error("对话失败", log.Error(chatErr))
			eventCh <- domain.SSEEvent{Type: "error", Content: "对话失败，请稍后再试"}
			return
		}
		eventCh <- domain.SSEEvent{Type: "done"}
	}()
	return eventCh, nil
}
