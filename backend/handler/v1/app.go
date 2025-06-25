package v1

import (
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type AppHandler struct {
	*handler.BaseHandler
	logger              *log.Logger
	auth                middleware.AuthMiddleware
	usecase             *usecase.AppUsecase
	modelUsecase        *usecase.ModelUsecase
	conversationUsecase *usecase.ConversationUsecase
	config              *config.Config
}

func NewAppHandler(e *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, usecase *usecase.AppUsecase, modelUsecase *usecase.ModelUsecase, conversationUsecase *usecase.ConversationUsecase, config *config.Config) *AppHandler {
	h := &AppHandler{
		BaseHandler:         baseHandler,
		logger:              logger.WithModule("handler.v1.app"),
		auth:                auth,
		usecase:             usecase,
		modelUsecase:        modelUsecase,
		conversationUsecase: conversationUsecase,
		config:              config,
	}

	group := e.Group("/api/v1/app", h.auth.Authorize)
	group.GET("/detail", h.GetAppDetail)
	group.PUT("", h.UpdateApp)
	group.DELETE("", h.DeleteApp)

	return h
}

// GetAppDetail get app detail
//
//	@Summary		Get app detail
//	@Description	Get app detail
//	@Tags			app
//	@Accept			json
//	@Produce		json
//	@Param			kb_id	query		string	true	"kb id"
//	@Param			type	query		string	true	"app type"
//	@Success		200		{object}	domain.Response{data=domain.AppDetailResp}
//	@Router			/api/v1/app/detail [get]
func (h *AppHandler) GetAppDetail(c echo.Context) error {
	kbID := c.QueryParam("kb_id")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb id is required", nil)
	}
	appType := c.QueryParam("type")
	if appType == "" {
		return h.NewResponseWithError(c, "type is required", nil)
	}
	appTypeInt, err := strconv.ParseInt(appType, 10, 64)
	if err != nil {
		return h.NewResponseWithError(c, "invalid app type", err)
	}
	ctx := c.Request().Context()
	app, err := h.usecase.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppType(appTypeInt))
	if err != nil {
		return h.NewResponseWithError(c, "get app detail failed", err)
	}
	return h.NewResponseWithData(c, app)
}

// UpdateApp update app
//
//	@Summary		Update app
//	@Description	Update app
//	@Tags			app
//	@Accept			json
//	@Produce		json
//	@Param			app	body		domain.UpdateAppReq	true	"app"
//	@Success		200	{object}	domain.Response
//	@Router			/api/v1/app [put]
func (h *AppHandler) UpdateApp(c echo.Context) error {
	id := c.QueryParam("id")
	if id == "" {
		return h.NewResponseWithError(c, "id is required", nil)
	}

	appRequest := domain.UpdateAppReq{}
	if err := c.Bind(&appRequest); err != nil {
		return h.NewResponseWithError(c, "invalid request", err)
	}

	ctx := c.Request().Context()
	if err := h.usecase.UpdateApp(ctx, id, &appRequest); err != nil {
		return h.NewResponseWithError(c, "update app failed", err)
	}

	return h.NewResponseWithData(c, nil)
}

// DeleteApp delete app
//
//	@Summary		Delete app
//	@Description	Delete app
//	@Tags			app
//	@Accept			json
//	@Param			id	query		string	true	"app id"
//	@Success		200	{object}	domain.Response
//	@Router			/api/v1/app [delete]
func (h *AppHandler) DeleteApp(c echo.Context) error {
	id := c.QueryParam("id")
	if id == "" {
		return h.NewResponseWithError(c, "id is required", nil)
	}

	if err := h.usecase.DeleteApp(c.Request().Context(), id); err != nil {
		return h.NewResponseWithError(c, "delete app failed", err)
	}

	return h.NewResponseWithData(c, nil)
}
