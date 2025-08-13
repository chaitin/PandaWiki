package share

import (
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareConversationHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.ConversationUsecase
}

func NewShareConversationHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.ConversationUsecase,
	logger *log.Logger,
) *ShareConversationHandler {
	h := &ShareConversationHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.conversation"),
		usecase:     usecase,
	}

	group := echo.Group("share/v1/conversation",
		h.ShareAuthMiddleware.Authorize,
	)
	group.GET("/detail", h.GetConversationDetail)

	return h
}

// GetConversationDetail
//
//	@Summary		GetConversationDetail
//	@Description	GetConversationDetail
//	@Tags			share_conversation
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Param			id		query		string	true	"conversation id"
//	@Success		200		{object}	domain.Response{data=domain.ShareConversationDetailResp}
//	@Router			/share/v1/conversation/detail [get]
func (h *ShareConversationHandler) GetConversationDetail(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	id := c.QueryParam("id")
	if id == "" {
		return h.NewResponseWithError(c, "id is required", nil)
	}

	node, err := h.usecase.GetShareConversationDetail(c.Request().Context(), kbID, id)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get node detail", err)
	}
	return h.NewResponseWithData(c, node)
}
