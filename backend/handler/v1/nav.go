package v1

import (
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/nav/v1"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type NavHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.NavUsecase
	auth    middleware.AuthMiddleware
}

func NewNavHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.NavUsecase,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
) *NavHandler {
	h := &NavHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.nav"),
		usecase:     usecase,
		auth:        auth,
	}

	group := echo.Group("/api/v1/nav", h.auth.Authorize, h.auth.ValidateKBUserPerm(consts.UserKBPermissionDocManage))
	group.GET("/list", h.NavList)
	group.POST("/add", h.NavAdd)
	group.DELETE("/delete", h.NavDelete)
	group.PATCH("/update", h.NavUpdate)
	group.POST("/move", h.NavMove)

	return h
}

// NavList
//
//	@Summary		获取分栏列表
//	@Description	Get Nav List
//	@Tags			Nav
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			params	query		v1.NavListReq	true	"Params"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.NavListResp}
//	@Router			/api/v1/nav/list [get]
func (h *NavHandler) NavList(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.NavListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}
	nodes, err := h.usecase.GetList(ctx, req.KbId)
	if err != nil {
		return h.NewResponseWithError(c, "get nav list failed", err)
	}
	return h.NewResponseWithData(c, nodes)
}

// NavAdd
//
//	@Summary		添加分栏
//	@Description	Add Nav
//	@Tags			Nav
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			body	body		v1.NavAddReq	true	"Params"
//	@Success		200		{object}	domain.PWResponse
//	@Router			/api/v1/nav/add [post]
func (h *NavHandler) NavAdd(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.NavAddReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}

	if err := h.usecase.Add(ctx, &req); err != nil {
		return h.NewResponseWithError(c, "add nav failed", err)
	}
	return h.NewResponseWithData(c, nil)

}

// NavDelete
//
//	@Summary		删除栏目
//	@Description	DeleteNav Nav
//	@Tags			Nav
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			query	query		v1.NavDeleteReq	true	"Params"
//	@Success		200		{object}	domain.PWResponse
//	@Router			/api/v1/nav/delete [delete]
func (h *NavHandler) NavDelete(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.NavDeleteReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}

	if err := h.usecase.Delete(ctx, &req); err != nil {
		return h.NewResponseWithError(c, "delete nav failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// NavMove
//
//	@Summary		移动栏目
//	@Description	Move Nav
//	@Tags			Nav
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			body	body		v1.NavMoveReq	true	"Params"
//	@Success		200		{object}	domain.PWResponse
//	@Router			/api/v1/nav/move [post]
func (h *NavHandler) NavMove(c echo.Context) error {
	ctx := c.Request().Context()
	var req v1.NavMoveReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}
	if err := h.usecase.Move(ctx, &req); err != nil {
		return h.NewResponseWithError(c, "move nav failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// NavUpdate
//
//	@Summary		更新栏目信息
//	@Description	Update Nav
//	@Tags			Nav
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			body	body		v1.NavUpdateReq	true	"Params"
//	@Success		200		{object}	domain.PWResponse
//	@Router			/api/v1/nav/update [patch]
func (h *NavHandler) NavUpdate(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.NavUpdateReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}

	if err := h.usecase.Update(ctx, &req); err != nil {
		return h.NewResponseWithError(c, "update nav failed", err)
	}
	return h.NewResponseWithData(c, nil)
}
