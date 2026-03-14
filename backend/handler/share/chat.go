package share

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareChatHandler struct {
	*handler.BaseHandler
	logger              *log.Logger
	appUsecase          *usecase.AppUsecase
	chatUsecase         *usecase.ChatUsecase
	authUsecase         *usecase.AuthUsecase
	conversationUsecase *usecase.ConversationUsecase
	modelUsecase        *usecase.ModelUsecase
}

func NewShareChatHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	appUsecase *usecase.AppUsecase,
	chatUsecase *usecase.ChatUsecase,
	authUsecase *usecase.AuthUsecase,
	conversationUsecase *usecase.ConversationUsecase,
	modelUsecase *usecase.ModelUsecase,
) *ShareChatHandler {
	h := &ShareChatHandler{
		BaseHandler:         baseHandler,
		logger:              logger.WithModule("handler.share.chat"),
		appUsecase:          appUsecase,
		chatUsecase:         chatUsecase,
		authUsecase:         authUsecase,
		conversationUsecase: conversationUsecase,
		modelUsecase:        modelUsecase,
	}

	share := e.Group("share/v1/chat",
		func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				c.Response().Header().Set("Access-Control-Allow-Origin", "*")
				c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept")
				if c.Request().Method == "OPTIONS" {
					return c.NoContent(http.StatusOK)
				}
				return next(c)
			}
		})
	share.POST("/message", h.ChatMessage, h.ShareAuthMiddleware.Authorize)
	share.POST("/search", h.ChatSearch, h.ShareAuthMiddleware.Authorize)
	share.POST("/completions", h.ChatCompletions)
	share.POST("/widget", h.ChatWidget)
	share.POST("/widget/search", h.WidgetSearch)
	share.POST("/feedback", h.FeedBack)
	return h
}

// ChatMessage chat message
//
//	@Summary		ChatMessage
//	@Description	ChatMessage
//	@Tags			share_chat
//	@Accept			json
//	@Produce		json
//	@Param			app_type	query		string				true	"app type"
//	@Param			request		body		domain.ChatRequest	true	"request"
//	@Success		200			{object}	domain.Response
//	@Router			/share/v1/chat/message [post]
func (h *ShareChatHandler) ChatMessage(c echo.Context) error {
	var req domain.ChatRequest
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse request failed", log.Error(err))
		return h.sendErrMsg(c, "parse request failed")
	}
	req.KBID = c.Request().Header.Get("X-KB-ID") // get from caddy header
	if err := c.Validate(&req); err != nil {
		h.logger.Error("validate request failed", log.Error(err))
		return h.sendErrMsg(c, "validate request failed")
	}

	for _, path := range req.ImagePaths {
		if !strings.HasPrefix(path, "/static-file/") {
			return h.sendErrMsg(c, "invalid image path")
		}
	}

	if req.Message == "" && len(req.ImagePaths) == 0 {
		return h.sendErrMsg(c, "message is empty")
	}

	if req.AppType != domain.AppTypeWeb {
		return h.sendErrMsg(c, "invalid app type")
	}
	ctx := c.Request().Context()
	// validate captcha token
	// if !h.Captcha.ValidateToken(ctx, req.CaptchaToken) {
	// 	return h.sendErrMsg(c, "failed to validate captcha")
	// }

	req.RemoteIP = c.RealIP()

	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("Transfer-Encoding", "chunked")

	// get user info --> no enterprise is nil
	userID := c.Get("user_id")
	h.logger.Debug("userid:", userID)
	if userID != nil { // find userinfo from auth
		userIDValue := userID.(uint)
		req.Info.UserInfo.AuthUserID = userIDValue
	}

	eventCh, err := h.chatUsecase.Chat(ctx, &req)
	if err != nil {
		return h.sendErrMsg(c, err.Error())
	}

	for event := range eventCh {
		if err := h.writeSSEEvent(c, event); err != nil {
			return err
		}
		if event.Type == "done" || event.Type == "error" {
			break
		}
	}
	return nil
}

// ChatWidget chat widget
//
//	@Summary		ChatWidget
//	@Description	ChatWidget
//	@Tags			Widget
//	@Accept			json
//	@Produce		json
//	@Param			app_type	query		string				true	"app type"
//	@Param			request		body		domain.ChatRequest	true	"request"
//	@Success		200			{object}	domain.Response
//	@Router			/share/v1/chat/widget [post]
func (h *ShareChatHandler) ChatWidget(c echo.Context) error {
	var req domain.ChatRequest
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse request failed", log.Error(err))
		return h.sendErrMsg(c, "parse request failed")
	}
	req.KBID = c.Request().Header.Get("X-KB-ID") // get from caddy header
	if err := c.Validate(&req); err != nil {
		h.logger.Error("validate request failed", log.Error(err))
		return h.sendErrMsg(c, "validate request failed")
	}
	if req.AppType != domain.AppTypeWidget {
		return h.sendErrMsg(c, "invalid app type")
	}
	if req.Message == "" && len(req.ImagePaths) == 0 {
		return h.sendErrMsg(c, "message is empty")
	}
	for _, path := range req.ImagePaths {
		if !strings.HasPrefix(path, "/static-file/") {
			return h.sendErrMsg(c, "invalid image path")
		}
	}

	// get widget app info
	widgetAppInfo, err := h.appUsecase.GetWidgetAppInfo(c.Request().Context(), req.KBID)
	if err != nil {
		h.logger.Error("get widget app info failed", log.Error(err))
		return h.sendErrMsg(c, "get app info error")
	}
	if !widgetAppInfo.Settings.WidgetBotSettings.IsOpen {
		return h.sendErrMsg(c, "widget is not open")
	}

	req.RemoteIP = c.RealIP()

	c.Response().Header().Set("Content-Type", "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("Transfer-Encoding", "chunked")

	eventCh, err := h.chatUsecase.Chat(c.Request().Context(), &req)
	if err != nil {
		return h.sendErrMsg(c, err.Error())
	}

	for event := range eventCh {
		if err := h.writeSSEEvent(c, event); err != nil {
			return err
		}
		if event.Type == "done" || event.Type == "error" {
			break
		}
	}
	return nil
}

func (h *ShareChatHandler) sendErrMsg(c echo.Context, errMsg string) error {
	return h.writeSSEEvent(c, domain.SSEEvent{Type: "error", Content: errMsg})
}

func (h *ShareChatHandler) writeSSEEvent(c echo.Context, data any) error {
	jsonContent, err := json.Marshal(data)
	if err != nil {
		return err
	}

	sseMessage := fmt.Sprintf("data: %s\n\n", string(jsonContent))
	if _, err := c.Response().Write([]byte(sseMessage)); err != nil {
		return err
	}
	c.Response().Flush()
	return nil
}

// FeedBack handle chat feedback
//
//	@Summary		Handle chat feedback
//	@Description	Process user feedback for chat conversations
//	@Tags			share_chat
//	@Accept			json
//	@Produce		json
//	@Param			request	body		domain.FeedbackRequest	true	"feedback request"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/chat/feedback [post]
func (h *ShareChatHandler) FeedBack(c echo.Context) error {
	// 前端传入对应的conversationId和feedback内容，后端处理并返回反馈结果
	var feedbackReq domain.FeedbackRequest
	if err := c.Bind(&feedbackReq); err != nil {
		return h.NewResponseWithError(c, "bind feedback request failed", err)
	}
	if err := c.Validate(&feedbackReq); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	h.logger.Debug("receive feedback request:", log.Any("feedback_request", feedbackReq))
	if err := h.conversationUsecase.FeedBack(c.Request().Context(), &feedbackReq); err != nil {
		return h.NewResponseWithError(c, "handle feedback failed", err)
	}
	return h.NewResponseWithData(c, "success")
}

// ChatCompletions OpenAI API compatible chat completions
//
//	@Summary		ChatCompletions
//	@Description	OpenAI API compatible chat completions endpoint
//	@Tags			share_chat
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string							true	"Knowledge Base ID"
//	@Param			request	body		domain.OpenAICompletionsRequest	true	"OpenAI API request"
//	@Success		200		{object}	domain.OpenAICompletionsResponse
//	@Failure		400		{object}	domain.OpenAIErrorResponse
//	@Router			/share/v1/chat/completions [post]
func (h *ShareChatHandler) ChatCompletions(c echo.Context) error {
	var req domain.OpenAICompletionsRequest
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse OpenAI request failed", log.Error(err))
		return h.sendOpenAIError(c, "parse request failed", "invalid_request_error")
	}

	// get kb id from header
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.sendOpenAIError(c, "X-KB-ID header is required", "invalid_request_error")
	}

	if err := c.Validate(&req); err != nil {
		h.logger.Error("validate OpenAI request failed", log.Error(err))
		return h.sendOpenAIError(c, "validate request failed", "invalid_request_error")
	}

	// validate messages
	if len(req.Messages) == 0 {
		return h.sendOpenAIError(c, "messages cannot be empty", "invalid_request_error")
	}

	// use last user message as message
	var lastUserMessage string
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			if req.Messages[i].Content != nil {
				lastUserMessage = req.Messages[i].Content.String()
			}
			break
		}
	}
	if lastUserMessage == "" {
		return h.sendOpenAIError(c, "no user message found", "invalid_request_error")
	}

	// validate api bot settings
	appBot, err := h.appUsecase.GetOpenAIAPIAppInfo(c.Request().Context(), kbID)
	if err != nil {
		return h.sendOpenAIError(c, err.Error(), "internal_error")
	}
	if !appBot.Settings.OpenAIAPIBotSettings.IsEnabled {
		return h.sendOpenAIError(c, "API Bot is not enabled", "forbidden")
	}

	secretKeyHeader := c.Request().Header.Get("Authorization")
	if secretKeyHeader == "" {
		return h.sendOpenAIError(c, "Authorization header is required", "invalid_request_error")
	}
	if secretKey, found := strings.CutPrefix(secretKeyHeader, "Bearer "); !found {
		return h.sendOpenAIError(c, "Invalid Authorization key format", "invalid_request_error")
	} else {
		if appBot.Settings.OpenAIAPIBotSettings.SecretKey != secretKey {
			return h.sendOpenAIError(c, "Invalid Authorization key", "unauthorized")
		}
	}

	chatReq := &domain.ChatRequest{
		Message:  lastUserMessage,
		KBID:     kbID,
		AppType:  domain.AppTypeOpenAIAPI,
		RemoteIP: c.RealIP(),
	}

	// set stream response header
	if req.Stream {
		c.Response().Header().Set("Content-Type", "text/event-stream")
		c.Response().Header().Set("Cache-Control", "no-cache")
		c.Response().Header().Set("Connection", "keep-alive")
		c.Response().Header().Set("Transfer-Encoding", "chunked")
	}

	eventCh, err := h.chatUsecase.Chat(c.Request().Context(), chatReq)
	if err != nil {
		return h.sendOpenAIError(c, err.Error(), "internal_error")
	}

	// handle stream response
	if req.Stream {
		return h.handleOpenAIStreamResponse(c, eventCh, req.Model)
	} else {
		return h.handleOpenAINonStreamResponse(c, eventCh, req.Model)
	}
}

func (h *ShareChatHandler) handleOpenAIStreamResponse(c echo.Context, eventCh <-chan domain.SSEEvent, model string) error {
	responseID := "chatcmpl-" + generateID()
	created := time.Now().Unix()

	for event := range eventCh {
		switch event.Type {
		case "error":
			return h.sendOpenAIError(c, event.Content, "internal_error")
		case "data":
			// send stream response
			streamResp := domain.OpenAIStreamResponse{
				ID:      responseID,
				Object:  "chat.completion.chunk",
				Created: created,
				Model:   model,
				Choices: []domain.OpenAIStreamChoice{
					{
						Index: 0,
						Delta: domain.OpenAIMessage{
							Role:    "assistant",
							Content: domain.NewStringContent(event.Content),
						},
					},
				},
			}

			if err := h.writeOpenAIStreamEvent(c, streamResp); err != nil {
				return err
			}
		case "done":
			// send done event
			streamResp := domain.OpenAIStreamResponse{
				ID:      responseID,
				Object:  "chat.completion.chunk",
				Created: created,
				Model:   model,
				Choices: []domain.OpenAIStreamChoice{
					{
						Index:        0,
						Delta:        domain.OpenAIMessage{},
						FinishReason: stringPtr("stop"),
					},
				},
			}
			return h.writeOpenAIStreamEvent(c, streamResp)
		}
	}
	return nil
}

func (h *ShareChatHandler) handleOpenAINonStreamResponse(c echo.Context, eventCh <-chan domain.SSEEvent, model string) error {
	responseID := "chatcmpl-" + generateID()
	created := time.Now().Unix()

	var content string
	for event := range eventCh {
		switch event.Type {
		case "error":
			return h.sendOpenAIError(c, event.Content, "internal_error")
		case "data":
			content += event.Content
		case "done":
			// send complete response
			resp := domain.OpenAICompletionsResponse{
				ID:      responseID,
				Object:  "chat.completion",
				Created: created,
				Model:   model,
				Choices: []domain.OpenAIChoice{
					{
						Index: 0,
						Message: domain.OpenAIMessage{
							Role:    "assistant",
							Content: domain.NewStringContent(content),
						},
						FinishReason: "stop",
					},
				},
			}
			return c.JSON(http.StatusOK, resp)
		}
	}
	return nil
}

func (h *ShareChatHandler) sendOpenAIError(c echo.Context, message, errorType string) error {
	errResp := domain.OpenAIErrorResponse{
		Error: domain.OpenAIError{
			Message: message,
			Type:    errorType,
		},
	}
	return c.JSON(http.StatusBadRequest, errResp)
}

func (h *ShareChatHandler) writeOpenAIStreamEvent(c echo.Context, data domain.OpenAIStreamResponse) error {
	jsonContent, err := json.Marshal(data)
	if err != nil {
		return err
	}

	sseMessage := fmt.Sprintf("data: %s\n\n", string(jsonContent))
	if _, err := c.Response().Write([]byte(sseMessage)); err != nil {
		return err
	}
	c.Response().Flush()
	return nil
}

func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func stringPtr(s string) *string {
	return &s
}

// ChatSearch searches chat messages in shared knowledge base
//
//	@Summary		ChatSearch
//	@Description	ChatSearch
//	@Tags			share_chat_search
//	@Accept			json
//	@Produce		json
//	@Param			request	body		domain.ChatSearchReq	true	"request"
//	@Success		200		{object}	domain.Response{data=domain.ChatSearchResp}
//	@Router			/share/v1/chat/search [post]
func (h *ShareChatHandler) ChatSearch(c echo.Context) error {
	var req domain.ChatSearchReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "parse request failed", err)
	}
	req.KBID = c.Request().Header.Get("X-KB-ID") // get from caddy header
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	ctx := c.Request().Context()
	// validate captcha token
	if !h.Captcha.ValidateToken(ctx, req.CaptchaToken) {
		return h.NewResponseWithError(c, "invalid captcha token", nil)
	}

	req.RemoteIP = c.RealIP()

	// get user info --> no enterprise is nil
	userID := c.Get("user_id")
	if userID != nil {
		if userIDValue, ok := userID.(uint); ok {
			req.AuthUserID = userIDValue
		} else {
			return h.NewResponseWithError(c, "invalid user id type", nil)
		}
	}

	resp, err := h.chatUsecase.Search(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to search docs", err)
	}
	return h.NewResponseWithData(c, resp)
}

// WidgetSearch
//
//	@Summary		WidgetSearch
//	@Description	WidgetSearch
//	@Tags			Widget
//	@Accept			json
//	@Produce		json
//	@Param			request	body		domain.ChatSearchReq	true	"Comment"
//	@Success		200		{object}	domain.Response{data=domain.ChatSearchResp}
//	@Router			/share/v1/chat/widget/search [post]
func (h *ShareChatHandler) WidgetSearch(c echo.Context) error {
	var req domain.ChatSearchReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "parse request failed", err)
	}
	req.KBID = c.Request().Header.Get("X-KB-ID")
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	ctx := c.Request().Context()

	// validate widget info
	widgetAppInfo, err := h.appUsecase.GetWidgetAppInfo(c.Request().Context(), req.KBID)
	if err != nil {
		h.logger.Error("get widget app info failed", log.Error(err))
		return h.sendErrMsg(c, "get app info error")
	}
	if !widgetAppInfo.Settings.WidgetBotSettings.IsOpen {
		return h.sendErrMsg(c, "widget is not open")
	}

	req.RemoteIP = c.RealIP()

	resp, err := h.chatUsecase.Search(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to search docs", err)
	}
	return h.NewResponseWithData(c, resp)
}
