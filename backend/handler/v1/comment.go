package v1

import (
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/labstack/echo/v4"
)

type CommentHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	auth    middleware.AuthMiddleware
	usecase *usecase.CommentUsecase
}

func NewCommentHandler(e *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware,
	usecase *usecase.CommentUsecase) *CommentHandler {
	h := &CommentHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.comment"),
		auth:        auth,
		usecase:     usecase,
	}

	group := e.Group("/api/v1/comment", h.auth.Authorize)
	group.GET("", h.GetCommentList)
	group.DELETE("/list", h.DeleteCommentList)

	return h
}

type CommentLists = domain.PaginatedResult[[]*domain.CommentListItem]

// GetCommentList
//
//	@Summary		GetCommentList
//	@Description	GetCommentList
//	@Tags			comment
//	@Accept			json
//	@Produce		json
//	@Param			req	query		domain.CommentListReq				true	"CommentListReq"
//	@Success		200	{object}	domain.Response{data=CommentLists}	"conversationList"
//	@Router			/api/v1/comment [get]
func (h *CommentHandler) GetCommentList(c echo.Context) error {
	var req domain.CommentListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "bind request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	ctx := c.Request().Context()

	conversationList, err := h.usecase.GetCommentListByKbID(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get comment list KBID", err)
	}
	return h.NewResponseWithData(c, conversationList)
}

// DeleteCommentList
//
//	@Summary		DeleteCommentList
//	@Description	DeleteCommentList
//	@Tags			comment
//	@Accept			json
//	@Produce		json
//	@Param			req	query		domain.DeleteCommentListReq	true	"DeleteCommentListReq"
//	@Success		200	{object}	domain.Response				"total"
//	@Router			/api/v1/comment/list [delete]
func (h *CommentHandler) DeleteCommentList(c echo.Context) error {
	var req domain.DeleteCommentListReq
	ids := c.QueryParams()["ids[]"]
	if len(ids) == 0 {
		return h.NewResponseWithError(c, "len comment id is zero", nil)
	}
	req.IDS = ids
	ctx := c.Request().Context()
	err := h.usecase.DeleteCommentList(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete comment list", err)
	}

	// success
	return h.NewResponseWithData(c, nil)
}
