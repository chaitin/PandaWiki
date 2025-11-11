package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wecom"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/cache"
)

type WecomUsecase struct {
	logger      *log.Logger
	cache       *cache.Cache
	AppUsecase  *AppUsecase
	authRepo    *pg.AuthRepo
	chatUsecase *ChatUsecase
}

func NewWecomUsecase(logger *log.Logger, cache *cache.Cache, AppUsecase *AppUsecase, chatUsecase *ChatUsecase, authRepo *pg.AuthRepo) *WecomUsecase {
	return &WecomUsecase{
		logger:      logger.WithModule("usecase.wecom"),
		cache:       cache,
		AppUsecase:  AppUsecase,
		chatUsecase: chatUsecase,
		authRepo:    authRepo,
	}
}

func (u *WecomUsecase) createAIBotClient(ctx context.Context, appInfo *domain.AppDetailResp) (*wecom.AIBotClient, error) {
	return wecom.NewAIBotClient(
		ctx,
		u.logger,
		appInfo.Settings.WecomAIBotSettings.Token,
		appInfo.Settings.WecomAIBotSettings.EncodingAESKey,
	)
}

func (u *WecomUsecase) VerifyUrlService(ctx context.Context, signature, timestamp, nonce, echoStr string, appInfo *domain.AppDetailResp) (string, error) {
	wecomAIBotClient, err := u.createAIBotClient(ctx, appInfo)
	if err != nil {
		return "", err
	}
	body, err := wecomAIBotClient.VerifyUrlWecomService(signature, timestamp, nonce, echoStr)
	if err != nil {
		u.logger.Error("WecomServiceConf verify url failed", log.Error(err))
		return "", err
	}
	return body, nil
}

// HandleMsg processes incoming WeChat Work AI Bot messages and returns encrypted responses.
// It supports two message types:
// - "text": Initial user question, triggers async AI processing
// - "stream": Polling request for AI response chunks
//
// Parameters:
//   - ctx: Request context for cancellation
//   - kbID: Knowledge base identifier
//   - signature, timestamp, nonce: WeChat Work signature verification params
//   - msgCrypted: Encrypted message body from WeChat Work
//   - appInfo: Application configuration including bot credentials
//
// Returns encrypted response string or error.
func (u *WecomUsecase) HandleMsg(ctx context.Context, kbID, signature, timestamp, nonce, msgCrypted string, appInfo *domain.AppDetailResp) (string, error) {
	wecomAIBotClient, err := u.createAIBotClient(ctx, appInfo)
	if err != nil {
		return "", err
	}

	req, err := wecomAIBotClient.DecryptUserReq(signature, timestamp, nonce, msgCrypted)
	if err != nil {
		u.logger.Error("WecomServiceConf decrypt failed", log.Error(err))
		return "", err
	}

	switch req.Msgtype {
	case "text":
		// Generate conversation ID
		id, err := uuid.NewV7()
		if err != nil {
			u.logger.Error("failed to generate conversation uuid", log.Error(err))
			id = uuid.New()
		}
		conversationID := id.String()

		redisKey := fmt.Sprintf("wecom-aibot-%s", req.Msgid)
		if err := u.cache.SetNX(ctx, redisKey, conversationID, 15*time.Minute).Err(); err != nil {
			u.logger.Error("failed to store conversation mapping in cache",
				log.String("redis_key", redisKey),
				log.String("conversation_id", conversationID),
				log.Error(err))
			return "", fmt.Errorf("cache operation failed: %w", err)
		}

		// Get auth user for WeChat Work bot
		auth, err := u.authRepo.GetAuthBySourceType(ctx, domain.AppTypeWecomAIBot.ToSourceType())
		if err != nil {
			u.logger.Error("get auth failed", log.Error(err))
			return "", err
		}

		// Store conversation state in manager first
		if _, ok := domain.ConversationManager.Load(conversationID); !ok {
			state := &domain.ConversationState{
				Question:         req.Text.Content,
				NotificationChan: make(chan string),
				IsVisited:        false,
				IsDone:           false,
			}
			_, loaded := domain.ConversationManager.LoadOrStore(conversationID, state)
			if !loaded {
				go func() {
					bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
					defer cancel()
					eventCh, err := u.chatUsecase.Chat(bgCtx, &domain.ChatRequest{
						Message:        req.Text.Content,
						KBID:           kbID,
						AppType:        domain.AppTypeWecomAIBot,
						RemoteIP:       "",
						ConversationID: conversationID,
						Info: domain.ConversationInfo{
							UserInfo: domain.UserInfo{
								AuthUserID: auth.ID,
								UserID:     req.From.Userid,
								NickName:   req.From.Userid,
								From:       domain.MessageFromPrivate,
							},
						},
					})
					if err != nil {
						u.logger.Error("failed to create chat", log.Error(err))
						// Clean up state
						if val, ok := domain.ConversationManager.Load(conversationID); ok {
							state := val.(*domain.ConversationState)
							state.Mutex.Lock()
							state.IsDone = true
							state.Mutex.Unlock()
							close(state.NotificationChan)
						}
						return
					}
					u.SendQuestionToAI(conversationID, eventCh)
				}()
			}
		}

		resp, err := wecomAIBotClient.MakeStreamResp(nonce, req.Msgid, "<think>正在思考您的问题,请稍候...</think>", false)
		if err != nil {
			u.logger.Error("MakeStreamResp failed", log.Error(err))
			return "", err
		}

		return resp, nil

	case "stream":

		redisKey := fmt.Sprintf("wecom-aibot-%s", req.Stream.Id)

		conversationId, err := u.cache.Get(ctx, redisKey).Result()
		if err != nil || conversationId == "" {
			resp, err := wecomAIBotClient.MakeStreamResp(nonce, req.Stream.Id, "服务内部异常，请稍后重试", true)
			if err != nil {
				u.logger.Error("MakeStreamResp failed", log.Error(err))
				return "", err
			}
			return resp, nil
		}

		val, ok := domain.ConversationManager.Load(conversationId)
		if !ok {
			resp, err := wecomAIBotClient.MakeStreamResp(nonce, req.Stream.Id, "服务暂时不可用，请稍后重试", true)
			if err != nil {
				u.logger.Error("MakeStreamResp failed", log.Error(err))
				return "", err
			}
			return resp, nil
		}

		state := val.(*domain.ConversationState)
		state.Mutex.Lock()
		content := state.Buffer.String()
		state.Mutex.Unlock()

		if content == "" {
			content = "<think>正在思考您的问题,请稍候...</think>"
		}

		if state.IsDone {
			domain.ConversationManager.Delete(conversationId)
			content += "\n\n---  \n\n本回答由 [LiteWiki](https://wiki.webinfra.cloud/) 基于 AI 生成，仅供参考。"
		}

		resp, err := wecomAIBotClient.MakeStreamResp(nonce, req.Stream.Id, content, state.IsDone)
		if err != nil {
			u.logger.Error("MakeStreamResp failed", log.Error(err))
			return "", err
		}
		return resp, nil

	default:
		return "", errors.New("msgtype not support")
	}
}

// SendQuestionToAI processes AI response events and stores them in conversation state buffer
func (u *WecomUsecase) SendQuestionToAI(conversationID string, eventCh <-chan domain.SSEEvent) {
	val, ok := domain.ConversationManager.Load(conversationID)
	if !ok {
		u.logger.Error("conversation not found in manager", log.String("conversation_id", conversationID))
		return
	}

	state := val.(*domain.ConversationState)
	defer func() {
		close(state.NotificationChan)
		// 标记为完成，但不立即删除，让 stream 请求可以继续拉取
		state.Mutex.Lock()
		state.IsDone = true
		state.Mutex.Unlock()
		u.logger.Info("AI response completed", log.String("conversation_id", conversationID))
	}()

	// Process AI response events
	for event := range eventCh {
		if event.Type == "done" || event.Type == "error" {
			if event.Type == "error" {
				u.logger.Error("AI response error", log.String("conversation_id", conversationID), log.String("error", event.Content))
			}
			break
		}
		if event.Type == "data" {
			state.Mutex.Lock()
			if state.IsVisited {
				state.NotificationChan <- event.Content // notify has new data
			}
			state.Buffer.WriteString(event.Content)
			state.Mutex.Unlock()
		}
	}
}
