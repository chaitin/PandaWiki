package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	modelkit "github.com/chaitin/ModelKit/v2/usecase"
	"github.com/cloudwego/eino/schema"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/s3"
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
	s3Client            *s3.MinioClient
	logger              *log.Logger
	modelkit            *modelkit.ModelKit
}

func NewChatUsecase(llmUsecase *LLMUsecase, kbRepo *pg.KnowledgeBaseRepository, conversationUsecase *ConversationUsecase, modelUsecase *ModelUsecase, appRepo *pg.AppRepository,
	blockWordRepo *pg.BlockWordRepo, authRepo *pg.AuthRepo, s3Client *s3.MinioClient, logger *log.Logger) (*ChatUsecase, error) {
	modelkit := modelkit.NewModelKit(logger.Logger)
	u := &ChatUsecase{
		llmUsecase:          llmUsecase,
		conversationUsecase: conversationUsecase,
		modelUsecase:        modelUsecase,
		appRepo:             appRepo,
		blockWordRepo:       blockWordRepo,
		kbRepo:              kbRepo,
		AuthRepo:            authRepo,
		s3Client:            s3Client,
		logger:              logger.WithModule("usecase.chat"),
		modelkit:            modelkit,
	}
	if err := u.initDFA(); err != nil {
		u.logger.Error("failed to init dfa", log.Error(err))
		return nil, err
	}
	return u, nil
}

func (u *ChatUsecase) pickVisionModel(ctx context.Context, chatFallback *domain.Model) (*domain.Model, error) {
	vm, err := u.modelUsecase.GetModelByType(ctx, domain.ModelTypeAnalysisVL)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		u.logger.Warn("get analysis-vl model failed, try chat model", log.Error(err))
	}
	if err == nil && vm != nil {
		if vm.ID == "" || vm.Parameters.SupportImages {
			return vm, nil
		}
	}
	if chatFallback.ID != "" && !chatFallback.Parameters.SupportImages {
		return nil, fmt.Errorf("请配置支持多模态的 analysis-vl 视觉模型，或为对话模型开启「支持图片」后再使用附图提问")
	}
	return chatFallback, nil
}

func formatWorkModeAttributeClarify(categoryName string, missing []string) string {
	name := strings.TrimSpace(categoryName)
	list := strings.Join(missing, "、")
	return "当前为「工作模式」，您的问题已命中品类「" + name + "」。为准确检索知识库，请先补充以下信息（后台配置维度）：" + list + "。\n\n请逐条说明；若某项不适用请写明「不适用」及原因。"
}

func (u *ChatUsecase) sendWorkModeClarifyAndFinish(
	ctx context.Context,
	eventCh chan<- domain.SSEEvent,
	req *domain.ChatRequest,
	messageId, userMessageId, clarify string,
	blockWords []string,
) {
	answer := ""
	onChunk, flushBuffer := u.CreateAcOnChunk(ctx, req.KBID, &answer, eventCh, blockWords)
	_ = onChunk(ctx, "data", clarify)
	if flushBuffer != nil {
		flushBuffer(ctx, "data")
	}
	if err := u.conversationUsecase.CreateChatConversationMessage(ctx, req.KBID, &domain.ConversationMessage{
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
		u.logger.Error("work mode: failed to save clarify message", log.Error(err))
		eventCh <- domain.SSEEvent{Type: "error", Content: "failed to save assistant clarify message"}
		return
	}
	eventCh <- domain.SSEEvent{Type: "done"}
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
		if req.AppType == domain.AppTypeWechatServiceBot || req.AppType == domain.AppTypeWechatBot || req.AppType == domain.AppTypeWecomAIBot { // wechat service has its own id
			nonce := uuid.New().String()
			eventCh <- domain.SSEEvent{Type: "conversation_id", Content: req.ConversationID}
			eventCh <- domain.SSEEvent{Type: "nonce", Content: nonce}
			err = u.conversationUsecase.CreateConversation(ctx, &domain.Conversation{
				ID:        req.ConversationID,
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
		} else if req.ConversationID == "" {
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
			ImagePaths:     req.ImagePaths,
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

		if req.Info.UserInfo.AuthUserID == 0 {
			auth, _ := u.AuthRepo.GetAuthBySourceType(ctx, req.AppType.ToSourceType())
			if auth != nil {
				req.Info.UserInfo.AuthUserID = auth.ID
			}
		}

		groupIds, err := u.AuthRepo.GetAuthGroupIdsWithParentsByAuthId(ctx, req.Info.UserInfo.AuthUserID)
		if err != nil {
			u.logger.Error("failed to get auth groupIds", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get auth groupIds"}
			return
		}

		topN := req.TopN
		if topN == 0 {
			topN = 10
		}

		var imageCategoryMatch *domain.CategoryPromptItem
		retrievalAugment := ""
		if len(req.ImagePaths) > 0 && u.s3Client != nil {
			sendChainStep := func(step int, title, detail string) {
				b, jErr := json.Marshal(map[string]any{"step": step, "title": title, "detail": detail})
				if jErr != nil {
					return
				}
				eventCh <- domain.SSEEvent{Type: "chain_step", Content: string(b)}
			}
			sendChainStep(0, "附图检索准备", "已收到附图，将依次完成：识别画面 → 品类判断 →（若命中）按品类提取检索要点 → 向量检索。")

			dataURL, rerr := ResolveImageRefForVision(ctx, u.s3Client, req.ImagePaths[0])
			if rerr != nil {
				u.logger.Error("resolve image for chat vision failed", log.Error(rerr))
				sendChainStep(0, "附图检索准备", "无法加载图片："+rerr.Error())
			} else {
				vm, verr := u.pickVisionModel(ctx, req.ModelInfo)
				if verr != nil {
					sendChainStep(0, "附图检索准备", verr.Error())
				} else {
					aug, imgCat, aerr := u.llmUsecase.BuildImageUnderstandingForRAG(ctx, vm, req.KBID, strings.TrimSpace(req.Message), dataURL, sendChainStep)
					if aerr != nil {
						u.logger.Error("image understanding for RAG failed", log.Error(aerr))
						sendChainStep(0, "附图检索准备", "视觉分析失败："+aerr.Error())
					} else {
						retrievalAugment = aug
						imageCategoryMatch = imgCat
					}
				}
			}
			sendChainStep(4, "向量检索", "正在根据上述理解与知识库进行关联检索…")
		}

		if strings.TrimSpace(req.QaMode) == domain.QaModeWork {
			cats, werr := u.llmUsecase.GetWorkModeCategoryPrompts(ctx, req.KBID)
			if werr != nil {
				u.logger.Warn("work mode: load category prompts failed, skip gate", log.Error(werr))
			} else if len(cats) > 0 {
				modelkitModel, mkErr := req.ModelInfo.ToModelkitModel()
				if mkErr != nil {
					u.logger.Warn("work mode: modelkit convert failed, skip gate", log.Error(mkErr))
				} else {
					gateChatModel, gErr := u.modelkit.GetChatModel(ctx, modelkitModel)
					if gErr != nil {
						u.logger.Warn("work mode: get chat model failed, skip gate", log.Error(gErr))
					} else {
						qctx, qErr := u.llmUsecase.BuildWorkModeQuestionContext(ctx, req.ConversationID, req.Message)
						if qErr != nil {
							u.logger.Warn("work mode: build question context failed, skip gate", log.Error(qErr))
						} else {
							var matchedForGate *domain.CategoryPromptItem
							if len(req.ImagePaths) > 0 {
								if imageCategoryMatch != nil && len(splitCategoryCommaAttrs(imageCategoryMatch.Attributes)) > 0 {
									matchedForGate = imageCategoryMatch
								}
							} else {
								var cErr error
								matchedForGate, cErr = u.llmUsecase.ClassifyTextQuestionCategory(ctx, gateChatModel, qctx, cats)
								if cErr != nil {
									u.logger.Warn("work mode: text category classify failed, skip gate", log.Error(cErr))
									matchedForGate = nil
								}
							}
							if matchedForGate != nil && len(splitCategoryCommaAttrs(matchedForGate.Attributes)) > 0 {
								missing, mErr := u.llmUsecase.WorkModeListMissingAttributes(ctx, gateChatModel, *matchedForGate, qctx, retrievalAugment)
								if mErr != nil {
									u.logger.Warn("work mode: missing attributes check failed, continue RAG", log.Error(mErr))
								} else if len(missing) > 0 {
									clarify := formatWorkModeAttributeClarify(matchedForGate.Name, missing)
									b, jErr := json.Marshal(map[string]any{"step": 5, "title": "工作模式：属性核对", "detail": "品类「" + matchedForGate.Name + "」尚缺：" + strings.Join(missing, "、")})
									if jErr == nil {
										eventCh <- domain.SSEEvent{Type: "chain_step", Content: string(b)}
									}
									u.sendWorkModeClarifyAndFinish(ctx, eventCh, req, messageId, userMessageId, clarify, blockWords)
									return
								}
							}
						}
					}
				}
			}
		}

		messages, rankedNodes, err := u.llmUsecase.BuildConversationMessageWithRAG(ctx, req.ConversationID, req.KBID, groupIds, req.Prompt, topN, retrievalAugment, req.QaMode)
		if err != nil {
			u.logger.Error("build messages failed", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: err.Error()}
			return
		}

		u.logger.Debug("message:", log.Any("schema", messages))
		for _, node := range rankedNodes {
			chunkResult := domain.NodeContentChunkSSE{
				NodeID:        node.NodeID,
				Name:          node.NodeName,
				Summary:       node.NodeSummary,
				Emoji:         node.NodeEmoji,
				NodePathNames: node.NodePathNames,
			}
			eventCh <- domain.SSEEvent{Type: "chunk_result", ChunkResult: &chunkResult}
		}
		// 5. LLM inference (streaming callback), message storage, token statistics
		answer := ""
		usage := schema.TokenUsage{}

		modelkitModel, err := req.ModelInfo.ToModelkitModel()
		if err != nil {
			u.logger.Error("failed to convert model to modelkit model", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to convert model to modelkit model"}
			return
		}
		chatModel, err := u.modelkit.GetChatModel(ctx, modelkitModel)

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

func (u *ChatUsecase) ChatRagOnly(ctx context.Context, req *domain.ChatRagOnlyRequest) (<-chan domain.SSEEvent, error) {
	eventCh := make(chan domain.SSEEvent, 100)
	go func() {
		defer close(eventCh)

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
				return
			}
		}

		if req.UserInfo.AuthUserID == 0 {
			auth, _ := u.AuthRepo.GetAuthBySourceType(ctx, req.AppType.ToSourceType())
			if auth != nil {
				req.UserInfo.AuthUserID = auth.ID
			}
		}

		groupIds, err := u.AuthRepo.GetAuthGroupIdsWithParentsByAuthId(ctx, req.UserInfo.AuthUserID)
		if err != nil {
			u.logger.Error("failed to get auth groupIds", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get auth groupIds"}
			return
		}

		// retrieve documents
		kb, err := u.kbRepo.GetKnowledgeBaseByID(ctx, req.KBID)
		if err != nil {
			u.logger.Error("failed to get kb", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get kb"}
			return
		}
		_, rankedNodes, err := u.llmUsecase.GetRankNodes(ctx, GetRankNodesRequest{
			DatasetID:           kb.DatasetID,
			Question:            req.Message,
			GroupIDs:            groupIds,
			HistoryMessages:     nil,
			SimilarityThreshold: 0,
			MaxChunksPerDoc:     1,
		})
		if err != nil {
			u.logger.Error("failed to get rank nodes", log.Error(err))
			eventCh <- domain.SSEEvent{Type: "error", Content: "failed to get rank nodes"}
			return
		}
		documents := domain.FormatNodeChunks(rankedNodes, kb.AccessSettings.BaseURL)
		u.logger.Debug("documents", log.String("documents", documents))

		// send only the documents part
		eventCh <- domain.SSEEvent{Type: "data", Content: documents}
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

func (u *ChatUsecase) Search(ctx context.Context, req *domain.ChatSearchReq) (*domain.ChatSearchResp, error) {
	groupIds, err := u.AuthRepo.GetAuthGroupIdsWithParentsByAuthId(ctx, req.AuthUserID)
	if err != nil {
		return nil, err
	}
	kb, err := u.kbRepo.GetKnowledgeBaseByID(ctx, req.KBID)
	if err != nil {
		return nil, err
	}
	_, rankedNodes, err := u.llmUsecase.GetRankNodes(ctx, GetRankNodesRequest{
		DatasetID:           kb.DatasetID,
		Question:            req.Message,
		GroupIDs:            groupIds,
		SimilarityThreshold: 0.2,
		HistoryMessages:     nil,
	})
	if err != nil {
		return nil, err
	}
	resp := domain.ChatSearchResp{}
	for _, node := range rankedNodes {
		chunkResult := domain.NodeContentChunkSSE{
			NodeID:        node.NodeID,
			Name:          node.NodeName,
			Summary:       node.NodeSummary,
			Emoji:         node.NodeEmoji,
			NodePathNames: node.NodePathNames,
		}
		resp.NodeResult = append(resp.NodeResult, chunkResult)
	}
	return &resp, nil
}
