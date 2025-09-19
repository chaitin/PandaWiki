package v1

import (
	"errors"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type KnowledgeBaseHandler struct {
	*handler.BaseHandler
	usecase    *usecase.KnowledgeBaseUsecase
	llmUsecase *usecase.LLMUsecase
	logger     *log.Logger
	auth       middleware.AuthMiddleware
}

func NewKnowledgeBaseHandler(
	baseHandler *handler.BaseHandler,
	echo *echo.Echo,
	usecase *usecase.KnowledgeBaseUsecase,
	llmUsecase *usecase.LLMUsecase,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
) *KnowledgeBaseHandler {
	h := &KnowledgeBaseHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.knowledge_base"),
		usecase:     usecase,
		llmUsecase:  llmUsecase,
		auth:        auth,
	}

	group := echo.Group("/api/v1/knowledge_base", h.auth.Authorize)
	group.POST("", h.CreateKnowledgeBase, h.auth.ValidateUserRole(consts.UserRoleAdmin))
	group.GET("/list", h.GetKnowledgeBaseList)
	group.GET("/detail", h.GetKnowledgeBaseDetail)
	group.PUT("/detail", h.UpdateKnowledgeBase, h.auth.ValidateKBUserPerm(consts.UserKBPermissionFullControl))
	group.DELETE("/detail", h.DeleteKnowledgeBase, h.auth.ValidateUserRole(consts.UserRoleAdmin))

	// user management
	userGroup := group.Group("/user", h.auth.ValidateKBUserPerm(consts.UserKBPermissionFullControl))
	userGroup.GET("/list", h.KBUserList)
	userGroup.POST("/invite", h.KBUserInvite)
	userGroup.PATCH("/update", h.KBUserUpdate)
	userGroup.DELETE("/delete", h.KBUserDelete)

	// release
	releaseGroup := group.Group("/release", h.auth.ValidateKBUserPerm(consts.UserKBPermissionDocManage))
	releaseGroup.POST("", h.CreateKBRelease)
	releaseGroup.GET("/list", h.GetKBReleaseList)

	return h
}

// CreateKnowledgeBase
//
//	@Summary		CreateKnowledgeBase
//	@Description	CreateKnowledgeBase
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.CreateKnowledgeBaseReq	true	"CreateKnowledgeBase Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base [post]
func (h *KnowledgeBaseHandler) CreateKnowledgeBase(c echo.Context) error {

	var req domain.CreateKnowledgeBaseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	req.Hosts = lo.Uniq(req.Hosts)
	req.Ports = lo.Uniq(req.Ports)
	req.SSLPorts = lo.Uniq(req.SSLPorts)

	if len(req.Hosts) == 0 {
		return h.NewResponseWithError(c, "hosts is required", nil)
	}
	if len(req.Ports)+len(req.SSLPorts) == 0 {
		return h.NewResponseWithError(c, "ports is required", nil)
	}

	req.MaxKB = 1
	maxKB := c.Get("max_kb")
	if maxKB != nil {
		req.MaxKB = maxKB.(int)
	}

	did, err := h.usecase.CreateKnowledgeBase(c.Request().Context(), &req)
	if err != nil {
		if errors.Is(err, domain.ErrPortHostAlreadyExists) {
			return h.NewResponseWithError(c, "端口或域名已被其他知识库占用", nil)
		}
		if errors.Is(err, domain.ErrSyncCaddyConfigFailed) {
			return h.NewResponseWithError(c, "端口可能已被其他程序占用，请检查", nil)
		}
		return h.NewResponseWithError(c, "failed to create knowledge base", err)
	}

	return h.NewResponseWithData(c, map[string]string{
		"id": did,
	})
}

// GetKnowledgeBaseList
//
//	@Summary		GetKnowledgeBaseList
//	@Description	GetKnowledgeBaseList
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.PWResponse{data=[]domain.KnowledgeBaseListItem}
//	@Router			/api/v1/knowledge_base/list [get]
func (h *KnowledgeBaseHandler) GetKnowledgeBaseList(c echo.Context) error {

	knowledgeBases, err := h.usecase.GetKnowledgeBaseListByUserId(c.Request().Context())
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base list", err)
	}

	return h.NewResponseWithData(c, knowledgeBases)
}

// UpdateKnowledgeBase
//
//	@Summary		UpdateKnowledgeBase
//	@Description	UpdateKnowledgeBase
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.UpdateKnowledgeBaseReq	true	"UpdateKnowledgeBase Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base/detail [put]
func (h *KnowledgeBaseHandler) UpdateKnowledgeBase(c echo.Context) error {
	var req domain.UpdateKnowledgeBaseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	err := h.usecase.UpdateKnowledgeBase(c.Request().Context(), &req)
	if err != nil {
		if errors.Is(err, domain.ErrPortHostAlreadyExists) {
			return h.NewResponseWithError(c, "端口或域名已被其他知识库占用", nil)
		}
		if errors.Is(err, domain.ErrSyncCaddyConfigFailed) {
			return h.NewResponseWithError(c, "端口可能已被其他程序占用，请检查", nil)
		}
		return h.NewResponseWithError(c, "failed to update knowledge base", err)
	}

	return h.NewResponseWithData(c, nil)
}

// GetKnowledgeBaseDetail
//
//	@Summary		GetKnowledgeBaseDetail
//	@Description	GetKnowledgeBaseDetail
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			id	query		string	true	"Knowledge Base ID"
//	@Success		200	{object}	domain.PWResponse{data=domain.KnowledgeBaseDetail}
//	@Router			/api/v1/knowledge_base/detail [get]
func (h *KnowledgeBaseHandler) GetKnowledgeBaseDetail(c echo.Context) error {
	kbID := c.QueryParam("id")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb id is required", nil)
	}

	kb, err := h.usecase.GetKnowledgeBase(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base detail", err)
	}

	perm, err := h.usecase.GetKnowledgeBasePerm(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to get knowledge base permission", err)
	}

	if perm != consts.UserKBPermissionFullControl {
		kb.AccessSettings.PrivateKey = ""
		kb.AccessSettings.PublicKey = ""
	}

	return h.NewResponseWithData(c, &domain.KnowledgeBaseDetail{
		ID:             kb.ID,
		Name:           kb.Name,
		DatasetID:      kb.DatasetID,
		Perm:           perm,
		AccessSettings: kb.AccessSettings,
		CreatedAt:      kb.CreatedAt,
		UpdatedAt:      kb.UpdatedAt,
	})
}

// DeleteKnowledgeBase
//
//	@Summary		DeleteKnowledgeBase
//	@Description	DeleteKnowledgeBase
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Param			id	query		string	true	"Knowledge Base ID"
//	@Success		200	{object}	domain.Response
//	@Router			/api/v1/knowledge_base/detail [delete]
func (h *KnowledgeBaseHandler) DeleteKnowledgeBase(c echo.Context) error {
	kbID := c.QueryParam("id")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb id is required", nil)
	}

	err := h.usecase.DeleteKnowledgeBase(c.Request().Context(), kbID)
	if err != nil {
		return h.NewResponseWithError(c, "failed to delete knowledge base", err)
	}

	return h.NewResponseWithData(c, nil)
}

// CreateKBRelease
//
//	@Summary		CreateKBRelease
//	@Description	CreateKBRelease
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.CreateKBReleaseReq	true	"CreateKBRelease Request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/knowledge_base/release [post]
func (h *KnowledgeBaseHandler) CreateKBRelease(c echo.Context) error {
	req := &domain.CreateKBReleaseReq{}
	if err := c.Bind(req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	id, err := h.usecase.CreateKBRelease(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "create kb release failed", err)
	}

	return h.NewResponseWithData(c, map[string]any{
		"id": id,
	})
}

// GetKBReleaseList
//
//	@Summary		GetKBReleaseList
//	@Description	GetKBReleaseList
//	@Tags			knowledge_base
//	@Accept			json
//	@Produce		json
//	@Param			kb_id	query		string	true	"Knowledge Base ID"
//	@Success		200		{object}	domain.PWResponse{data=domain.GetKBReleaseListResp}
//	@Router			/api/v1/knowledge_base/release/list [get]
func (h *KnowledgeBaseHandler) GetKBReleaseList(c echo.Context) error {
	var req domain.GetKBReleaseListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request params is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request params failed", err)
	}

	resp, err := h.usecase.GetKBReleaseList(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "get kb release list failed", err)
	}

	return h.NewResponseWithData(c, resp)
}
