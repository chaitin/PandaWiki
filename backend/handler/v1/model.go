package v1

import (
	"github.com/labstack/echo/v4"

	modelkitDomain "github.com/chaitin/ModelKit/v2/domain"
	modelkit "github.com/chaitin/ModelKit/v2/usecase"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type ModelHandler struct {
	*handler.BaseHandler
	logger     *log.Logger
	auth       middleware.AuthMiddleware
	usecase    *usecase.ModelUsecase
	llmUsecase *usecase.LLMUsecase
	modelkit   *modelkit.ModelKit
}

func NewModelHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, usecase *usecase.ModelUsecase, llmUsecase *usecase.LLMUsecase) *ModelHandler {
	modelkit := modelkit.NewModelKit(logger.Logger)
	handler := &ModelHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.model"),
		auth:        auth,
		usecase:     usecase,
		llmUsecase:  llmUsecase,
		modelkit:    modelkit,
	}
	group := echo.Group("/api/v1/model", handler.auth.Authorize, handler.auth.ValidateUserRole(consts.UserRoleAdmin))
	group.GET("/list", handler.GetModelList)
	group.POST("/check", handler.CheckModel)
	group.POST("/provider/supported", handler.GetProviderSupportedModelList)
	group.POST("/switch-mode", handler.SwitchMode)
	group.GET("/mode-setting", handler.GetModelModeSetting)

	return handler
}

// GetModelList
//
//	@Summary		get model list
//	@Description	get model list
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.PWResponse{data=domain.ModelListItem}
//	@Router			/api/v1/model/list [get]
func (h *ModelHandler) GetModelList(c echo.Context) error {
	ctx := c.Request().Context()

	models, err := h.usecase.GetList(ctx)
	if err != nil {
		return h.NewResponseWithError(c, "get model list failed", err)
	}

	return h.NewResponseWithData(c, models)
}

// CheckModel
//
//	@Summary		check model
//	@Description	check model
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			model	body		domain.CheckModelReq	true	"check model request"
//	@Success		200		{object}	domain.Response{data=domain.CheckModelResp}
//	@Router			/api/v1/model/check [post]
func (h *ModelHandler) CheckModel(c echo.Context) error {
	var req domain.CheckModelReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	ctx := c.Request().Context()
	modelType := req.Type
	switch req.Type {
	case domain.ModelTypeAnalysis, domain.ModelTypeAnalysisVL: // for rag analysis
		modelType = domain.ModelTypeChat
	default:
	}
	model, err := h.modelkit.CheckModel(ctx, &modelkitDomain.CheckModelReq{
		Provider:   string(req.Provider),
		Model:      req.Model,
		BaseURL:    req.BaseURL,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		APIVersion: req.APIVersion,
		Type:       string(modelType),
		Param:      (*modelkitDomain.ModelParam)(req.Parameters),
	})
	if err != nil {
		return h.NewResponseWithError(c, "get model failed", err)
	}
	return h.NewResponseWithData(c, model)
}

// GetProviderSupportedModelList
//
//	@Summary		get provider supported model list
//	@Description	get provider supported model list
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			params	body		domain.GetProviderModelListReq	true	"get supported model list request"
//	@Success		200		{object}	domain.PWResponse{data=domain.GetProviderModelListResp}
//	@Router			/api/v1/model/provider/supported [post]
func (h *ModelHandler) GetProviderSupportedModelList(c echo.Context) error {
	var req domain.GetProviderModelListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	ctx := c.Request().Context()

	models, err := h.modelkit.ModelList(ctx, &modelkitDomain.ModelListReq{
		Provider:  req.Provider,
		BaseURL:   req.BaseURL,
		APIKey:    req.APIKey,
		APIHeader: req.APIHeader,
		Type:      string(req.Type),
	})
	if err != nil {
		return h.NewResponseWithError(c, "get user model list failed", err)
	}
	return h.NewResponseWithData(c, models)
}

// SwitchMode
//
//	@Summary		switch mode
//	@Description	switch model mode between manual and auto
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			request	body		domain.SwitchModeReq	true	"switch mode request"
//	@Success		200		{object}	domain.Response{data=domain.SwitchModeResp}
//	@Router			/api/v1/model/switch-mode [post]
func (h *ModelHandler) SwitchMode(c echo.Context) error {
	var req domain.SwitchModeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "bind request failed", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "validate request failed", err)
	}
	ctx := c.Request().Context()

	if err := h.usecase.SwitchMode(ctx, &req); err != nil {
		return h.NewResponseWithError(c, err.Error(), err)
	}

	resp := &domain.SwitchModeResp{
		Message: "模式切换成功",
	}
	return h.NewResponseWithData(c, resp)
}

// GetModelModeSetting
//
//	@Summary		get model mode setting
//	@Description	get current model mode setting including mode, API key and chat model
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.Response{data=domain.ModelModeSetting}
//	@Router			/api/v1/model/mode-setting [get]
func (h *ModelHandler) GetModelModeSetting(c echo.Context) error {
	ctx := c.Request().Context()
	setting, err := h.usecase.GetModelModeSetting(ctx)
	if err != nil {
		// 如果获取失败，返回默认值（手动模式）
		h.logger.Warn("failed to get model mode setting, return default", log.Error(err))
		defaultSetting := domain.ModelModeSetting{
			Mode:           consts.ModelSettingModeManual,
			AutoModeAPIKey: "",
			ChatModel:      "",
		}
		return h.NewResponseWithData(c, defaultSetting)
	}
	return h.NewResponseWithData(c, setting)
}
