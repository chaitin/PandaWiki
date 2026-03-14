package share

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
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
		}, h.ShareAuthMiddleware.Authorize)

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
//	@Success		200		{object}	domain.PWResponse{data=string}	"CommentID"
//	@Router			/share/v1/comment [post]
func (h *ShareCommentHandler) CreateComment(c echo.Context) error {
	ctx := c.Request().Context()

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	var req domain.CommentReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "bind comment request failed", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate req failed", err)
	}
	// 校验是否开启了评论
	appInfo, err := h.app.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppType(domain.AppTypeWeb))
	if err != nil {
		return h.NewResponseWithError(c, "app info is not found", err)
	}
	if !appInfo.Settings.WebAppCommentSettings.IsEnable {
		return h.NewResponseWithError(c, "please check comment is open", nil)
	}
	// validate captcha token
	// if !h.Captcha.ValidateToken(ctx, req.CaptchaToken) {
	// 	return h.NewResponseWithError(c, "failed to validate captcha token", nil)
	// }

	for _, url := range req.PicUrls {
		if !strings.HasPrefix(url, "/static-file/") {
			return h.NewResponseWithError(c, "validate param pic_urls failed", err)
		}
	}

	remoteIP := c.RealIP()

	// get user info --> no enterprise is nil
	var userIDValue uint
	userID := c.Get("user_id")
	if userID != nil { // can find userinfo from auth
		userIDValue = userID.(uint)
	}

	var status = 1 // no moderate
	// 判断user is moderate comment ---> 默认false
	if appInfo.Settings.WebAppCommentSettings.ModerationEnable {
		status = 0
	}
	commentStatus := domain.CommentStatus(status)

	// 插入到数据库中
	commentID, err := h.usecase.CreateComment(ctx, &req, kbID, remoteIP, commentStatus, userIDValue)
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
//	@Param			id	query		string										true	"nodeID"
//	@Success		200	{object}	domain.PWResponse{data=ShareCommentLists}	"CommentList
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
	appInfo, err := h.app.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppType(domain.AppTypeWeb))
	if err != nil {
		return h.NewResponseWithError(c, "app info is not found", err)
	}
	if !appInfo.Settings.WebAppCommentSettings.IsEnable {
		return h.NewResponseWithError(c, "please check comment is open", nil)
	}

	// 查询数据库获取所有评论-->0 所有， 1，2 为需要审核的评论
	commentsList, err := h.usecase.GetCommentListByNodeID(ctx, nodeID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get comment list", err)
	}

	return h.NewResponseWithData(c, commentsList)
}
