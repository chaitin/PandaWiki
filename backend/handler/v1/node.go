package v1

import (
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type NodeHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.NodeUsecase
	auth    middleware.AuthMiddleware
}

func NewNodeHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.NodeUsecase,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
) *NodeHandler {
	h := &NodeHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.node"),
		usecase:     usecase,
		auth:        auth,
	}

	group := echo.Group("/api/v1/node", h.auth.Authorize)
	group.GET("/list", h.GetNodeList)
	group.POST("", h.CreateNode)
	group.GET("/detail", h.GetNodeDetail)
	group.PUT("/detail", h.UpdateNodeDetail)
	group.POST("/summary", h.SummaryNode)

	group.POST("/action", h.NodeAction)
	group.POST("/move", h.MoveNode)

	group.GET("/recommend_nodes", h.RecommendNodes)

	return h
}

// Create Node
//
//	@Summary		Create Node
//	@Description	Create Node
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.CreateNodeReq	true	"Node"
//	@Success		200		{object}	domain.Response{data=map[string]string}
//	@Router			/api/v1/node [post]
func (h *NodeHandler) CreateNode(c echo.Context) error {
	req := &domain.CreateNodeReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	id, err := h.usecase.Create(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "create node failed", err)
	}
	return h.NewResponseWithData(c, map[string]any{
		"id": id,
	})
}

// Get Node List
//
//	@Summary		Get Node List
//	@Description	Get Node List
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			params	query		domain.GetNodeListReq	true	"Params"
//	@Success		200		{object}	domain.Response{data=[]domain.NodeListItemResp}
//	@Router			/api/v1/node/list [get]
func (h *NodeHandler) GetNodeList(c echo.Context) error {
	var req domain.GetNodeListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}
	ctx := c.Request().Context()
	nodes, err := h.usecase.GetList(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "get node list failed", err)
	}
	return h.NewResponseWithData(c, nodes)
}

// Get Node Detail
//
//	@Summary		Get Node Detail
//	@Description	Get Node Detail
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			id	query		string	true	"ID"
//	@Success		200	{object}	domain.Response{data=domain.NodeDetailResp}
//	@Router			/api/v1/node/detail [get]
func (h *NodeHandler) GetNodeDetail(c echo.Context) error {
	nodeID := c.QueryParam("id")
	if nodeID == "" {
		return h.NewResponseWithError(c, "node id is required", nil)
	}
	node, err := h.usecase.GetByID(c.Request().Context(), nodeID)
	if err != nil {
		return h.NewResponseWithError(c, "get node detail failed", err)
	}
	return h.NewResponseWithData(c, node)
}

// Node Action
//
//	@Summary		Node Action
//	@Description	Node Action
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			action	body		domain.NodeActionReq	true	"Action"
//	@Success		200		{object}	domain.Response{data=map[string]string}
//	@Router			/api/v1/node/action [post]
func (h *NodeHandler) NodeAction(c echo.Context) error {
	req := &domain.NodeActionReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	ctx := c.Request().Context()
	if err := h.usecase.NodeAction(ctx, req); err != nil {
		if err == domain.ErrNodeParentIDInIDs {
			return h.NewResponseWithError(c, "文件夹下有子文件，不能删除~", nil)
		}
		return h.NewResponseWithError(c, "node action failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// Update Node Detail
//
//	@Summary		Update Node Detail
//	@Description	Update Node Detail
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.UpdateNodeReq	true	"Node"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/node/detail [put]
func (h *NodeHandler) UpdateNodeDetail(c echo.Context) error {
	req := &domain.UpdateNodeReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	ctx := c.Request().Context()
	if err := h.usecase.Update(ctx, req); err != nil {
		return h.NewResponseWithError(c, "update node detail failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// Move Node
//
//	@Summary		Move Node
//	@Description	Move Node
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.MoveNodeReq	true	"Move Node"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/node/move [post]
func (h *NodeHandler) MoveNode(c echo.Context) error {
	req := &domain.MoveNodeReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	ctx := c.Request().Context()
	if err := h.usecase.MoveNode(ctx, req); err != nil {
		return h.NewResponseWithError(c, "move node failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// Summary Node
//
//	@Summary		Summary Node
//	@Description	Summary Node
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.NodeSummaryReq	true	"Summary Node"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/node/summary [post]
func (h *NodeHandler) SummaryNode(c echo.Context) error {
	req := &domain.NodeSummaryReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	ctx := c.Request().Context()
	summary, err := h.usecase.SummaryNode(ctx, req)
	if err != nil {
		if err == domain.ErrModelNotConfigured {
			return h.NewResponseWithError(c, "请前往管理后台，点击右上角的“系统设置”配置推理大模型。", err)
		}
		return h.NewResponseWithError(c, "summary node failed", err)
	}
	return h.NewResponseWithData(c, map[string]any{
		"summary": summary,
	})
}

// Recommend Nodes
//
//	@Summary		Recommend Nodes
//	@Description	Recommend Nodes
//	@Tags			node
//	@Accept			json
//	@Produce		json
//	@Param			query	query		domain.GetRecommendNodeListReq	true	"Recommend Nodes"
//	@Success		200		{object}	domain.Response{data=[]domain.RecommendNodeListResp}
//	@Router			/api/v1/node/recommend_nodes [get]
func (h *NodeHandler) RecommendNodes(c echo.Context) error {
	var req domain.GetRecommendNodeListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request params is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}
	ctx := c.Request().Context()
	nodes, err := h.usecase.GetRecommendNodeList(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "get recommend nodes failed", err)
	}
	return h.NewResponseWithData(c, nodes)
}
