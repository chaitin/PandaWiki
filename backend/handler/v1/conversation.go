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

	group.GET("/test", handler.Test)
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

func (h *ConversationHandler) Test(c echo.Context) error {
	id := c.QueryParam("id")
	m, _ := h.usecase.Test(c.Request().Context(), id)
	return h.NewResponseWithData(c, m)
}
