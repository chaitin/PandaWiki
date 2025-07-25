package v1

import (
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

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
}

func NewModelHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, usecase *usecase.ModelUsecase, llmUsecase *usecase.LLMUsecase) *ModelHandler {
	handler := &ModelHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.model"),
		auth:        auth,
		usecase:     usecase,
		llmUsecase:  llmUsecase,
	}
	group := echo.Group("/api/v1/model", handler.auth.Authorize)
	group.GET("/list", handler.GetModelList)
	group.GET("/detail", handler.GetModelDetail)
	group.POST("", handler.CreateModel)
	group.POST("/check", handler.CheckModel)
	group.POST("/provider/supported", handler.GetProviderSupportedModelList)
	group.PUT("", handler.UpdateModel)

	return handler
}

// get model list
//
//	@Summary		get model list
//	@Description	get model list
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Success		200	{object}	domain.Response{data=domain.ModelListItem}
//	@Router			/api/v1/model/list [get]
func (h *ModelHandler) GetModelList(c echo.Context) error {
	ctx := c.Request().Context()

	models, err := h.usecase.GetList(ctx)
	if err != nil {
		return h.NewResponseWithError(c, "get model list failed", err)
	}

	return h.NewResponseWithData(c, models)
}

// get model detail
//
//	@Summary		get model detail
//	@Description	get model detail
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			id	query		string	true	"model id"
//	@Success		200	{object}	domain.Response{data=domain.ModelDetailResp}
//	@Router			/api/v1/model/detail [get]
func (h *ModelHandler) GetModelDetail(c echo.Context) error {
	id := c.QueryParam("id")
	if id == "" {
		return h.NewResponseWithError(c, "id is required", nil)
	}
	ctx := c.Request().Context()
	model, err := h.usecase.Get(ctx, id)
	if err != nil {
		return h.NewResponseWithError(c, "get model detail failed", err)
	}

	return h.NewResponseWithData(c, model)
}

// create model
//
//	@Summary		create model
//	@Description	create model
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			model	body		domain.CreateModelReq	true	"create model request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/model [post]
func (h *ModelHandler) CreateModel(c echo.Context) error {
	var req domain.CreateModelReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	edition := 0
	if editionVal := c.Get("edition"); editionVal != nil {
		edition = editionVal.(int)
	}
	if edition == 1 && req.Provider != domain.ModelProviderBrandBaiZhiCloud {
		return h.NewResponseWithError(c, "联创版只能使用百智云模型哦~", nil)
	}
	ctx := c.Request().Context()
	model := &domain.Model{
		ID:         uuid.New().String(),
		Provider:   req.Provider,
		Model:      req.Model,
		APIKey:     req.APIKey,
		APIHeader:  req.APIHeader,
		BaseURL:    req.BaseURL,
		APIVersion: req.APIVersion,
		Type:       req.Type,
	}
	if err := h.usecase.Create(ctx, model); err != nil {
		return h.NewResponseWithError(c, "create model failed", err)
	}
	return h.NewResponseWithData(c, model)
}

// update model
//
//	@Description	update model
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			model	body		domain.UpdateModelReq	true	"update model request"
//	@Success		200		{object}	domain.Response
//	@Router			/api/v1/model [put]
func (h *ModelHandler) UpdateModel(c echo.Context) error {
	var req domain.UpdateModelReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	edition := 0
	if editionVal := c.Get("edition"); editionVal != nil {
		edition = editionVal.(int)
	}
	if edition == 1 && req.Provider != domain.ModelProviderBrandBaiZhiCloud {
		return h.NewResponseWithError(c, "联创版只能使用百智云模型哦~", nil)
	}
	ctx := c.Request().Context()
	if err := h.usecase.Update(ctx, &req); err != nil {
		return h.NewResponseWithError(c, "update model failed", err)
	}
	return h.NewResponseWithData(c, nil)
}

// check model
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
	model, err := h.llmUsecase.CheckModel(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "get model failed", err)
	}
	return h.NewResponseWithData(c, model)
}

// get provider supported model list
//
//	@Summary		get provider supported model list
//	@Description	get provider supported model list
//	@Tags			model
//	@Accept			json
//	@Produce		json
//	@Param			params	query		domain.GetProviderModelListReq	true	"get supported model list request"
//	@Success		200		{object}	domain.Response{data=domain.GetProviderModelListResp}
//	@Router			/api/v1/model/provider/supported [get]
func (h *ModelHandler) GetProviderSupportedModelList(c echo.Context) error {
	var req domain.GetProviderModelListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	if err := c.Validate(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}
	ctx := c.Request().Context()

	models, err := h.usecase.GetUserModelList(ctx, &req)
	if err != nil {
		return h.NewResponseWithError(c, "get user model list failed", err)
	}
	return h.NewResponseWithData(c, models)
}
