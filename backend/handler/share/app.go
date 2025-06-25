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

	share.GET("/wechat/callback", h.VerifiyUrl)
	share.POST("/wechat/callback", h.WechatHandler)

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

// 这个借口是用来校验企业微信的请求的  --- 完全是为了契合企业微信设计的handler函数
func (h *ShareAppHandler) VerifiyUrl(c echo.Context) error {
	// 获取对应的参数
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")
	echostr := c.QueryParam("echostr")

	// kbID := c.Request().Header.Get("X-KB-ID")

	// if kbID == "" {
	// 	return h.NewResponseWithError(c, "kb_id is required", nil)
	// }
	kbID := "2cf45424-ee13-4f71-86ef-6d9cef0d0cec"

	if signature == "" || timestamp == "" || nonce == "" || echostr == "" {
		return h.NewResponseWithError(
			c, "Verifiy Wechat failed", nil,
		)
	}

	ctx := c.Request().Context()

	// 回调callback
	req, err := h.usecase.VerifiyUrl(ctx, signature, timestamp, nonce, echostr, kbID)
	if err != nil {
		return h.NewResponseWithError(c, "VerifyURL failed", err)
	}

	// success
	return c.String(http.StatusOK, string(req))
}

// 企业微信发送post请求 --- 使用对应的token加密传输
func (h *ShareAppHandler) WechatHandler(c echo.Context) error {

	// 获取请求参数
	signature := c.QueryParam("msg_signature")
	timestamp := c.QueryParam("timestamp")
	nonce := c.QueryParam("nonce")

	// kbID := c.Request().Header.Get("X-KB-ID")

	// if kbID == "" {
	// 	return h.NewResponseWithError(c, "kb_id is required", nil)
	// }

	// 先校验kbid
	kbID := "2cf45424-ee13-4f71-86ef-6d9cef0d0cec"

	RemoteIP := c.RealIP()

	// 读取请求体
	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		c.Logger().Error("读取请求体失败", "error", err)
		return h.NewResponseWithError(c, "Internal Server Error", err)
	}
	defer c.Request().Body.Close()

	// 处理消息
	ctx := c.Request().Context()

	// 拿到了对应的“立即回复的byte类型”发送给企业微信
	immediateResponse, err := h.usecase.SendImmediateResponse(ctx, signature, timestamp, nonce, body, kbID)
	if err != nil {
		c.Logger().Error("发送立即响应失败", "error", err)
		return h.NewResponseWithError(c, "Failed to send immediate response", err)
	}

	// 之后异步的读取消息体来实现异步的发送完整的消息给企业微信机器人（主动推送消息给对应的应用）
	go func(signature, timestamp, nonce string, body []byte, KbId string, remoteip string) {
		ctx := context.Background()
		err := h.usecase.Wechat(ctx, signature, timestamp, nonce, body, KbId, remoteip)
		if err != nil {
			h.logger.Error("wechat async failed")
		}
	}(signature, timestamp, nonce, body, kbID, RemoteIP)

	// 直接回复正在思考
	return c.XMLBlob(http.StatusOK, []byte(immediateResponse))
}
