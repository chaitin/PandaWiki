package share

import (
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/share/v1"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareNavHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.NavUsecase
}

func NewShareNavHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.NavUsecase,
	logger *log.Logger,
) *ShareNavHandler {
	h := &ShareNavHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.nav"),
		usecase:     usecase,
	}

	group := echo.Group("share/v1/nav",
		h.ShareAuthMiddleware.Authorize,
	)
	group.GET("/list", h.ShareNavList)

	return h
}

// ShareNavList
//
//	@Summary		前台获取栏目列表
//	@Description	ShareNavList
//	@Tags			share_nav
//	@Accept			json
//	@Produce		json
//	@Param			param	query		v1.ShareNavListReq	true	"para"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/nav/list [get]
func (h *ShareNavHandler) ShareNavList(c echo.Context) error {

	var req v1.ShareNavListReq
	if err := c.Bind(&req); err != nil {
		h.logger.Error("parse request failed", log.Error(err))
		return h.NewResponseWithError(c, "parse request failed", err)
	}

	if err := c.Validate(&req); err != nil {
		h.logger.Error("validate request failed", log.Error(err))
		return h.NewResponseWithError(c, "validate request failed", err)
	}

	navs, err := h.usecase.GetList(c.Request().Context(), req.KbId)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get nav list", err)
	}

	return h.NewResponseWithData(c, navs)
}
