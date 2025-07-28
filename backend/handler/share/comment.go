package share

import (
	"net/http"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/labstack/echo/v4"
)

type ShareCommentHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.CommentUsecase
	app     *usecase.AppUsecase
}

func NewShareCommentHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	usecase *usecase.CommentUsecase,
	app *usecase.AppUsecase,
) *ShareCommentHandler {
	h := &ShareCommentHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.comment"),
		usecase:     usecase,
		app:         app,
	}

	share := e.Group("share/v1/comment",
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

	share.POST("", h.CreateComment)
	share.GET("/list", h.GetCommentList)
	return h
}

// CreateComment
//
//	@Summary		CreateComment
//	@Description	CreateComment
//	@Tags			share_comment
//	@Accept			json
//	@Produce		json
//	@Param			comment	body		domain.CommentReq				true	"Comment"
//	@Success		200		{object}	domain.Response{data=string}	"CommentID"
//	@Router			/share/v1/comment [post]
func (h *ShareCommentHandler) CreateComment(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	// 用户传入对应的comment参数
	var CommentReq domain.CommentReq
	if err := c.Bind(&CommentReq); err != nil {
		return h.NewResponseWithError(c, "bind comment request failed", err)
	}
	if err := c.Validate(&CommentReq); err != nil {
		return h.NewResponseWithError(c, "validate req failed", err)
	}
	// 校验是否开启了评论
	appinfo, err := h.app.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppType(domain.AppTypeWeb))
	if err != nil {
		return h.NewResponseWithError(c, "app info is not found", err)
	}
	h.logger.Debug("app info", log.Any("appinfo.comment_enable", appinfo.Settings.WebAppCommentSettings))
	if !appinfo.Settings.WebAppCommentSettings.IsEnable {
		return h.NewResponseWithError(c, "please check comment is open", nil)
	}

	// 评论开启
	remoteIP := c.RealIP()

	// 插入到数据库中
	commentID, err := h.usecase.CreateComment(ctx, &CommentReq, kbID, remoteIP)
	if err != nil {
		return h.NewResponseWithError(c, "create comment failed", err)
	}

	return h.NewResponseWithData(c, commentID)
}

type ShareCommentLists = *domain.PaginatedResult[[]*domain.ShareCommentListItem]

// GetCommentList
//
//	@Summary		GetCommentList
//	@Description	GetCommentList
//	@Tags			share_comment
//	@Accept			json
//	@Produce		json
//	@Param			id	query		string									true	"nodeID"
//	@Success		200	{object}	domain.Response{data=ShareCommentLists}	"CommentList
//	@Router			/share/v1/comment/list [get]
func (h *ShareCommentHandler) GetCommentList(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	// 拿到node_id即可
	nodeID := c.QueryParam("id")
	if nodeID == "" {
		return h.NewResponseWithError(c, "node id is required", nil)
	}

	// 校验是否开启了评论
	appinfo, err := h.app.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppType(domain.AppTypeWeb))
	if err != nil {
		return h.NewResponseWithError(c, "app info is not found", err)
	}
	h.logger.Info("app info", log.Any("appinfo.comment_enable", appinfo.Settings.WebAppCommentSettings))
	if !appinfo.Settings.WebAppCommentSettings.IsEnable {
		return h.NewResponseWithError(c, "please check comment is open", nil)
	}

	// 查询数据库获取所有评论
	commentsList, err := h.usecase.GetCommentListByNodeID(ctx, nodeID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get comment list", err)
	}

	return h.NewResponseWithData(c, commentsList)
}
