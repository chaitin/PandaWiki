package share

import (
	"context"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareAppHandler struct {
	*handler.BaseHandler
	logger  *log.Logger
	usecase *usecase.AppUsecase
}

func NewShareAppHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	usecase *usecase.AppUsecase,
) *ShareAppHandler {
	h := &ShareAppHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.app"),
		usecase:     usecase,
	}

	share := e.Group("share/v1/app",
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
	share.GET("/web/info", h.GetWebAppInfo)

	share.GET("/wechat/app", h.VerifyUrl_APP)
	share.POST("/wechat/app", h.WechatHandler_APP)

	return h
}

// GetAppInfo
//
//	@Summary		GetAppInfo
//	@Description	GetAppInfo
//	@Tags			share_app
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Success		200		{object}	domain.Response
//	@Router			/share/v1/app/web/info [get]
func (h *ShareAppHandler) GetWebAppInfo(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	appInfo, err := h.usecase.GetWebAppInfo(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, err.Error(), err)
	}
	return h.NewResponseWithData(c, appInfo)
}

func (h *ShareAppHandler) VerifyUrl_APP(c echo.Context) error {
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")
	echostr := c.QueryParam("echostr")

	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	if signature == "" || timestamp == "" || nonce == "" || echostr == "" {
		return h.NewResponseWithError(
			c, "Verifiy Wechat_APP failed", nil,
		)
	}

	ctx := c.Request().Context()

	req, err := h.usecase.VerifyUrl_APP(ctx, signature, timestamp, nonce, echostr, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "VerifyURL_APP failed", err)
	}

	// success
	return c.String(http.StatusOK, string(req))
}

func (h *ShareAppHandler) WechatHandler_APP(c echo.Context) error {

	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")

	kbID := c.Request().Header.Get("X-KB-ID")

	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		h.logger.Error("get request failed", log.Error(err))
		return h.NewResponseWithError(c, "Internal Server Error", err)
	}
	defer c.Request().Body.Close()

	ctx := c.Request().Context()

	immediateResponse, err := h.usecase.SendImmediateResponse(ctx, signature, timestamp, nonce, body, kbID)
	if err != nil {
		h.logger.Error("send response failed", log.Error(err))
		return h.NewResponseWithError(c, "Failed to send immediate response", err)
	}

	go func(signature, timestamp, nonce string, body []byte, kbID string) {
		ctx := context.Background()
		err := h.usecase.Wechat(ctx, signature, timestamp, nonce, body, kbID)
		if err != nil {
			h.logger.Error("wechat async failed")
		}
	}(signature, timestamp, nonce, body, kbID)

	return c.XMLBlob(http.StatusOK, []byte(immediateResponse))
}
