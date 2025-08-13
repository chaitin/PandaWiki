package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/utils"
)

type ChatUsecase struct {
	llmUsecase          *LLMUsecase
	conversationUsecase *ConversationUsecase
	modelUsecase        *ModelUsecase
	appRepo             *pg.AppRepository
	blockWordRepo       *pg.BlockWordRepo
	kbRepo              *pg.KnowledgeBaseRepository
	AuthRepo            *pg.AuthRepo
	logger              *log.Logger
}

func NewChatUsecase(llmUsecase *LLMUsecase, kbRepo *pg.KnowledgeBaseRepository, conversationUsecase *ConversationUsecase, modelUsecase *ModelUsecase, appRepo *pg.AppRepository,
	blockWordRepo *pg.BlockWordRepo, authRepo *pg.AuthRepo, logger *log.Logger) (*ChatUsecase, error) {
	u := &ChatUsecase{
		llmUsecase:          llmUsecase,
		conversationUsecase: conversationUsecase,
		modelUsecase:        modelUsecase,
		appRepo:             appRepo,
		blockWordRepo:       blockWordRepo,
		kbRepo:              kbRepo,
		AuthRepo:            authRepo,
		logger:              logger.WithModule("usecase.chat"),
	}
	if err := u.initDFA(); err != nil {
		u.logger.Error("failed to init dfa", log.Error(err))
		return nil, err
	}
	return u, nil
}

func (u *ChatUsecase) initDFA() error {
	ctx := context.Background()
	kbList, err := u.kbRepo.GetKnowledgeBaseList(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get kb list: %w", err)
	}
	for _, kb := range kbList {
		if kb != nil {
			words, err := u.blockWordRepo.GetBlockWords(ctx, kb.ID)
			if err != nil {
				u.logger.Error("failed to get words", log.Error(err), log.String("kb_id", kb.ID))
				return fmt.Errorf("failed to get words for kb: %w", err)
			}
			if len(words) > 0 {
				utils.InitDFA(kb.ID, words)
			}
		}
	}
	return nil
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
		// extra1. if user set question block words then check it
		blockWords, err := u.blockWordRepo.GetBlockWords(ctx, req.KBID)
		if err != nil {
			u.logger.Error("failed to get question block words", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get question block words"}
			return
		}
		if len(blockWords) > 0 { // check --> filter
			questionFilter := utils.GetDFA(req.KBID)
			if err := questionFilter.DFA.Check(req.Message); err != nil { // exist then return err
				answer := "**您的问题包含敏感词, AI 无法回答您的问题。**"
				eventCh <- domain.SSEEvent{Type: "error", Content: answer}
				// save ai answer and set it err
				if err := u.conversationUsecase.CreateChatConversationMessage(context.Background(), req.KBID, &domain.ConversationMessage{
					ID:             messageId,
					ConversationID: req.ConversationID,
					KBID:           req.KBID,
					AppID:          req.AppID,
					Role:           schema.Assistant,
					Content:        answer,
					Provider:       req.ModelInfo.Provider,
					Model:          string(req.ModelInfo.Model),
					RemoteIP:       req.RemoteIP,
					ParentID:       userMessageId,
				}); err != nil {
					u.logger.Error("failed to save assistant answer to conversation message", log.Error(err))
					eventCh <- domain.SSEEvent{Type: "error", Content: "failed to save assistant answer to conversation message"}
					return
				}
				return
			}
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
		// get words
		onChunkAC, flushBuffer := u.CreateAcOnChunk(ctx, req.KBID, &answer, eventCh, blockWords)
		chatErr := u.llmUsecase.ChatWithAgent(ctx, chatModel, messages, &usage, onChunkAC)

		// 处理缓冲区中剩余的内容
		if flushBuffer != nil {
			flushBuffer(ctx, "data")
		}

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

func (u *ChatUsecase) CreateAcOnChunk(ctx context.Context, kbID string, answer *string, eventCh chan<- domain.SSEEvent, blockWords []string) (func(ctx context.Context, dataType, chunk string) error,
	func(ctx context.Context, dataType string)) {
	var buffer strings.Builder
	// 如果用户没有设置敏感词，不需要处理
	if len(blockWords) == 0 {
		onChunk := func(ctx context.Context, dataType, chunk string) error {
			*answer += chunk
			eventCh <- domain.SSEEvent{Type: dataType, Content: chunk}
			return nil
		}
		return onChunk, nil
	}

	// get filter --> exist
	filter := utils.GetDFA(kbID)

	onChunk := func(ctx context.Context, dataType, chunk string) error {
		buffer.WriteString(chunk)

		// 将缓冲区内容转换为 rune 切片，以便正确处理多字节字符
		bufferRunes := []rune(buffer.String())

		// 基于 rune 长度与 bufferSize 进行比较，确保正确处理多字节字符
		if len(bufferRunes) >= filter.BuffSize {
			fullContent := buffer.String() // get buffer string

			// 直接处理完整内容
			processedContent := u.replaceWithSimpleString(fullContent, filter.DFA)
			processedRunes := []rune(processedContent)

			// 输出前面的部分，保留后面bufferSize - 1个rune
			outputPart := string(processedRunes[:len(processedRunes)-filter.BuffSize+1])
			*answer += outputPart
			eventCh <- domain.SSEEvent{Type: dataType, Content: outputPart}

			// 清空缓冲区
			newBufferContent := string(processedRunes[len(processedRunes)-filter.BuffSize+1:])
			buffer.Reset()
			buffer.WriteString(newBufferContent)
		}
		return nil
	}

	flushBuffer := func(ctx context.Context, dataType string) { //小于bufferSize的内容
		bufferRunes := []rune(buffer.String())
		if len(bufferRunes) > 0 {
			fullContent := buffer.String()
			processedContent := u.replaceWithSimpleString(fullContent, filter.DFA)
			*answer += processedContent
			eventCh <- domain.SSEEvent{Type: dataType, Content: processedContent}
		}
	}

	return onChunk, flushBuffer
}

// replaceWithSimpleString
func (u *ChatUsecase) replaceWithSimpleString(content string, filter *utils.DFA) string {
	r1 := filter.Filter(content)
	return r1
}
