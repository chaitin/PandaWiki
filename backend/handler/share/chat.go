package share

import (
	"encoding/json"
	"fmt"
	"net/http"

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
	conversationUsecase *usecase.ConversationUsecase
	modelUsecase        *usecase.ModelUsecase
}

func NewShareChatHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	appUsecase *usecase.AppUsecase,
	chatUsecase *usecase.ChatUsecase,
	conversationUsecase *usecase.ConversationUsecase,
	modelUsecase *usecase.ModelUsecase,
) *ShareChatHandler {
	h := &ShareChatHandler{
		BaseHandler:         baseHandler,
		logger:              logger.WithModule("handler.share.chat"),
		appUsecase:          appUsecase,
		chatUsecase:         chatUsecase,
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
	share.POST("/widget", h.ChatWidget)
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
	if req.AppType != domain.AppTypeWeb {
		return h.sendErrMsg(c, "invalid app type")
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

// ChatWidget chat widget
//
//	@Summary		ChatWidget
//	@Description	ChatWidget
//	@Tags			share_chat
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
		h.logger.Error("bind feedback request failed", log.Error(err))
		return h.NewResponseWithError(c, "bind feedback request failed", err)
	}
	if err := c.Validate(&feedbackReq); err != nil {
		h.logger.Error("validate request failed", log.Error(err))
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	h.logger.Debug("receive feedback request:", log.Any("feedback_request", feedbackReq))
	if err := h.conversationUsecase.FeedBack(c.Request().Context(), &feedbackReq); err != nil {
		h.logger.Error("handle feedback failed", log.Error(err))
		return h.NewResponseWithError(c, "handle feedback failed", err)
	}
	return h.NewResponseWithData(c, "success")
}
