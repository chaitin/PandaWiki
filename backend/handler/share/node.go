package share

import (
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareNodeHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.NodeUsecase
}

func NewShareNodeHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.NodeUsecase,
	logger *log.Logger,
) *ShareNodeHandler {
	h := &ShareNodeHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.node"),
		usecase:     usecase,
	}

	group := echo.Group("share/v1/node",
		h.ShareAuthMiddleware.Authorize,
	)
	group.GET("/list", h.GetNodeList)
	group.GET("/detail", h.GetNodeDetail)

	return h
}

// GetNodeList
//
//	@Summary		GetNodeList
//	@Description	GetNodeList
//	@Tags			share_node
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/node/list [get]
func (h *ShareNodeHandler) GetNodeList(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	nodes, err := h.usecase.GetNodeReleaseListByKBID(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get node list", err)
	}

	return h.NewResponseWithData(c, nodes)
}

// GetNodeDetail
//
//	@Summary		GetNodeDetail
//	@Description	GetNodeDetail
//	@Tags			share_node
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Param			id		query		string	true	"node id"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/node/detail [get]
func (h *ShareNodeHandler) GetNodeDetail(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	id := c.QueryParam("id")
	if id == "" {
		return h.NewResponseWithError(c, "id is required", nil)
	}

	node, err := h.usecase.GetNodeReleaseDetailByKBIDAndID(c.Request().Context(), kbID, id)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get node detail", err)
	}
	return h.NewResponseWithData(c, node)
}
