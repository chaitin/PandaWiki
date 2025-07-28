package handler

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
)

type BaseHandler struct {
	Router              *echo.Echo
	baseLogger          *log.Logger
	config              *config.Config
	ShareAuthMiddleware *middleware.ShareAuthMiddleware
	V1Auth              middleware.AuthMiddleware
}

func NewBaseHandler(echo *echo.Echo, logger *log.Logger, config *config.Config, v1Auth middleware.AuthMiddleware, shareAuthMiddleware *middleware.ShareAuthMiddleware) *BaseHandler {
	return &BaseHandler{
		Router:              echo,
		baseLogger:          logger.WithModule("http_base_handler"),
		config:              config,
		ShareAuthMiddleware: shareAuthMiddleware,
		V1Auth:              v1Auth,
	}
}

func (h *BaseHandler) NewResponseWithData(c echo.Context, data any) error {
	return c.JSON(http.StatusOK, domain.Response{
		Success: true,
		Data:    data,
	})
}

func (h *BaseHandler) NewResponseWithError(c echo.Context, msg string, err error) error {
	traceID := ""
	if h.config.GetBool("apm.enabled") {
		span := trace.SpanFromContext(c.Request().Context())
		traceID = span.SpanContext().TraceID().String()
		span.SetAttributes(attribute.String("error", fmt.Sprintf("%+v", err)), attribute.String("msg", msg))
	} else {
		traceID = uuid.New().String()
	}
	h.baseLogger.LogAttrs(c.Request().Context(), slog.LevelError, msg, slog.String("trace_id", traceID), slog.Any("error", err))
	return c.JSON(http.StatusOK, domain.Response{
		Success: false,
		Message: fmt.Sprintf("%s [trace_id: %s]", msg, traceID),
	})
}
