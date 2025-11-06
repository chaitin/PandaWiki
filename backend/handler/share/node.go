package share

import (
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
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

	nodes, err := h.usecase.GetNodeReleaseListByKBID(c.Request().Context(), kbID, domain.GetAuthID(c))
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
//	@Param			format	query		string	true	"format"
//	@Success		200		{object}	domain.Response{data=v1.ShareNodeDetailResp}
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

	errCode := h.usecase.ValidateNodePerm(c.Request().Context(), kbID, id, domain.GetAuthID(c))
	if errCode != nil {
		return h.NewResponseWithErrCode(c, *errCode)
	}

	node, err := h.usecase.GetNodeReleaseDetailByKBIDAndID(c.Request().Context(), kbID, id, c.QueryParam("format"))
	if err != nil {
		return h.NewResponseWithError(c, "failed to get node detail", err)
	}
	return h.NewResponseWithData(c, node)
}
