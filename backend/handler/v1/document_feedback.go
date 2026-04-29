package v1

import (
	"strconv"
	"strings"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/labstack/echo/v4"
)

type DocumentFeedbackHandler struct {
	*handler.BaseHandler
	logger   *log.Logger
	auth     middleware.AuthMiddleware
	feedback *usecase.DocumentFeedbackUsecase
}

func NewDocumentFeedbackHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	auth middleware.AuthMiddleware,
	feedback *usecase.DocumentFeedbackUsecase,
) *DocumentFeedbackHandler {
	h := &DocumentFeedbackHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.document_feedback"),
		auth:        auth,
		feedback:    feedback,
	}

	pro := e.Group("/api/pro/v1/document",
		h.auth.Authorize,
		h.auth.ValidateUserRole(consts.UserRoleAdmin),
	)
	pro.GET("/list", h.List)
	pro.DELETE("/feedback", h.Delete)
	return h
}

type documentFeedbackListData struct {
	Data  []domain.DocumentFeedbackListItem `json:"data"`
	Total int64                             `json:"total"`
}

func (h *DocumentFeedbackHandler) List(c echo.Context) error {
	ctx := c.Request().Context()
	kbID := c.QueryParam("kb_id")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	page, _ := strconv.Atoi(c.QueryParam("page"))
	perPage, _ := strconv.Atoi(c.QueryParam("per_page"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	category := c.QueryParam("feedback_category")

	rows, total, err := h.feedback.ListForAdmin(ctx, kbID, category, page, perPage)
	if err != nil {
		return h.NewResponseWithError(c, "list failed", err)
	}
	return h.NewResponseWithData(c, documentFeedbackListData{Data: rows, Total: total})
}

func (h *DocumentFeedbackHandler) Delete(c echo.Context) error {
	ctx := c.Request().Context()
	kbID := c.QueryParam("kb_id")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	raw := c.QueryParams()["ids"]
	if len(raw) == 0 {
		return h.NewResponseWithError(c, "ids is required", nil)
	}
	var ids []int64
	for _, s := range raw {
		for _, part := range strings.Split(s, ",") {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			id, err := strconv.ParseInt(part, 10, 64)
			if err != nil {
				return h.NewResponseWithError(c, "invalid id", err)
			}
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return h.NewResponseWithError(c, "ids is required", nil)
	}
	if err := h.feedback.DeleteByIDs(ctx, kbID, ids); err != nil {
		return h.NewResponseWithError(c, "delete failed", err)
	}
	return h.NewResponseWithData(c, nil)
}
