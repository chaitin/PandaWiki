package share

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type ShareDocumentFeedbackHandler struct {
	*handler.BaseHandler
	logger   *log.Logger
	feedback *usecase.DocumentFeedbackUsecase
}

func NewShareDocumentFeedbackHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	feedback *usecase.DocumentFeedbackUsecase,
) *ShareDocumentFeedbackHandler {
	h := &ShareDocumentFeedbackHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.share.document_feedback"),
		feedback:    feedback,
	}

	g := e.Group("share/pro/v1/document",
		func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				c.Response().Header().Set("Access-Control-Allow-Origin", "*")
				c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept, X-KB-ID")
				if c.Request().Method == http.MethodOptions {
					return c.NoContent(http.StatusOK)
				}
				return next(c)
			}
		},
		h.ShareAuthMiddleware.CheckForbidden,
	)
	g.POST("/feedback", h.CreateFeedback)
	return h
}

// CreateFeedback 提交文档纠错或站点问题反馈（multipart/form-data）
func (h *ShareDocumentFeedbackHandler) CreateFeedback(c echo.Context) error {
	ctx := c.Request().Context()
	kbID := strings.TrimSpace(c.Request().Header.Get("X-KB-ID"))
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}

	category := c.FormValue("feedback_category")
	if category == "" {
		category = domain.DocumentFeedbackCategoryDocument
	}

	in := usecase.CreateDocumentFeedbackShareInput{
		KbID:                 kbID,
		NodeID:               c.FormValue("node_id"),
		Category:             category,
		Content:              c.FormValue("content"),
		CorrectionSuggestion: c.FormValue("correction_suggestion"),
		RemoteIP:             c.RealIP(),
	}
	// 与 SaveNewSession 一致：user_id 存 auths.id（数字字符串）；路由未走 Authorize 时需从 session 读取
	if uid := c.Get("user_id"); uid != nil {
		if v, ok := uid.(uint); ok && v != 0 {
			in.UserID = strconv.FormatUint(uint64(v), 10)
		}
	} else if sess, err := session.Get(domain.SessionName, c); err == nil {
		kbSess, kbOk := sessionKbIDString(sess)
		if kbOk && kbSess == kbID {
			if uid, ok := sessionAuthUserIDString(sess); ok {
				in.UserID = uid
			}
		}
	}

	if err := h.feedback.CreateFromShare(ctx, in); err != nil {
		return h.NewResponseWithError(c, err.Error(), err)
	}
	return h.NewResponseWithData(c, nil)
}
