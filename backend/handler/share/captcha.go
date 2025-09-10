package share

import (
	"net/http"

	gocap "github.com/ackcoder/go-cap"
	"github.com/getsentry/sentry-go"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
)

type ShareCaptchaHandler struct {
	*handler.BaseHandler
	logger *log.Logger
}

func NewShareCaptchaHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	logger *log.Logger,
) *ShareCaptchaHandler {
	h := &ShareCaptchaHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.captcha"),
	}

	group := echo.Group("share/v1/captcha")
	group.POST("/challenge", h.CreateCaptcha)
	group.POST("/redeem", h.RedeemCaptcha)

	return h
}

// CreateCaptcha
//
//	@Summary		CreateCaptcha
//	@Description	CreateCaptcha
//	@Tags			share_captcha
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string	true	"kb id"
//	@Success		200		{object}	gocap.ChallengeData
//	@Router			/share/v1/captcha/challenge [post]
func (h *ShareCaptchaHandler) CreateCaptcha(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	data, err := h.Captcha.CreateChallenge(c.Request().Context())
	if err != nil {
		return h.NewResponseWithError(c, "create captcha failed", err)
	}
	return c.JSON(http.StatusCreated, data)
}

// RedeemCaptcha
//
//	@Summary		RedeemCaptcha
//	@Description	RedeemCaptcha
//	@Tags			share_captcha
//	@Accept			json
//	@Produce		json
//	@Param			X-KB-ID	header		string					true	"kb id"
//	@Param			body	body		consts.RedeemCaptchaReq	true	"request"
//	@Success		200		{object}	gocap.VerificationResult
//	@Router			/share/v1/captcha/redeem [post]
func (h *ShareCaptchaHandler) RedeemCaptcha(c echo.Context) error {
	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	var req consts.RedeemCaptchaReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request is invalid", err)
	}
	data, err := h.Captcha.RedeemChallenge(c.Request().Context(), req.Token, req.Solutions)
	if err != nil {
		sentry.CaptureException(err)
		return c.JSON(http.StatusInternalServerError, gocap.VerificationResult{
			Success: false,
			Message: err.Error(),
		})
	}
	return c.JSON(http.StatusCreated, gocap.VerificationResult{
		Success:   true,
		TokenData: data,
	})
}
