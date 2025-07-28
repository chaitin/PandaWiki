package v1

import (
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type ConversationHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	auth    middleware.AuthMiddleware
	usecase *usecase.ConversationUsecase
}

func NewConversationHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, usecase *usecase.ConversationUsecase) *ConversationHandler {
	handler := &ConversationHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler_conversation"),
		auth:        auth,
		usecase:     usecase,
	}
	group := echo.Group("/api/v1/conversation", handler.auth.Authorize)
	group.GET("", handler.GetConversationList)
	group.GET("/detail", handler.GetConversationDetail)
	group.GET("/message/list", handler.GetMessageFeedBackList)
	group.GET("/message/detail", handler.GetMessageDetail)

	return handler
}

type ConversationListItems = domain.PaginatedResult[[]domain.ConversationListItem]

// get conversation list
//
//	@Summary		get conversation list
//	@Description	get conversation list
//	@Tags			conversation
//	@Accept			json
//	@Produce		json
//	@Param			req	query		domain.ConversationListReq	true	"conversation list request"
//	@Success		200	{object}	domain.Response{data=ConversationListItems}
//	@Router			/api/v1/conversation [get]
func (h *ConversationHandler) GetConversationList(c echo.Context) error {
	var request domain.ConversationListReq
	if err := c.Bind(&request); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	ctx := c.Request().Context()

	conversationList, err := h.usecase.GetConversationList(ctx, &request)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get conversation list", err)
	}

	return h.NewResponseWithData(c, conversationList)
}

// get conversation detail
//
//	@Summary		get conversation detail
//	@Description	get conversation detail
//	@Tags			conversation
//	@Accept			json
//	@Produce		json
//	@Param			X-SafePoint-User-ID	header		string	true	"user id"
//	@Param			id					query		string	true	"conversation id"
//	@Success		200					{object}	domain.Response{data=domain.ConversationDetailResp}
//	@Router			/api/v1/conversation/detail [get]
func (h *ConversationHandler) GetConversationDetail(c echo.Context) error {
	conversationID := c.QueryParam("id")
	if conversationID == "" {
		return h.NewResponseWithError(c, "conversation id is required", nil)
	}

	conversation, err := h.usecase.GetConversationDetail(c.Request().Context(), conversationID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get conversation detail", err)
	}

	return h.NewResponseWithData(c, conversation)
}

// GetMessageFeedBackList GetMessageFeedBackList
//
//	@Summary		GetMessageFeedBackList
//	@Description	GetMessageFeedBackList
//	@Tags			Message
//	@Accept			json
//	@Produce		json
//	@Param			req	query		domain.MessageListReq																true	"message list request"
//
//	@Success		200	{object}	domain.Response{data=domain.PaginatedResult[[]domain.ConversationMessageListItem]}	"MessageList"
//	@Router			/api/v1/conversation/message/list [get]
func (h *ConversationHandler) GetMessageFeedBackList(c echo.Context) error {
	var request domain.MessageListReq
	if err := c.Bind(&request); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	h.logger.Info("GetMessageFeedBackList request", log.Any("request", request))
	ctx := c.Request().Context()
	messages, err := h.usecase.GetMessageList(ctx, &request)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get message list", err)
	}
	return h.NewResponseWithData(c, messages)
}

// GetMessageDetail get message detail
//
//	@Summary		Get message detail
//	@Description	Get message detail
//	@Tags			Message
//	@Accept			json
//	@Produce		json
//	@Param			id	query		string	true	"message id"
//	@Success		200	{object}	domain.Response{data=domain.ConversationMessage}
//	@Router			/api/v1/conversation/message/detail [get]
func (h *ConversationHandler) GetMessageDetail(c echo.Context) error {
	messageID := c.QueryParam("id")
	message, err := h.usecase.GetMessageDetail(c.Request().Context(), messageID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get message detail", err)
	}

	return h.NewResponseWithData(c, message)
}
