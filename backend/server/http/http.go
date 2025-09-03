package http

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryecho "github.com/getsentry/sentry-go/echo"
	"github.com/go-playground/validator"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"
	middlewareOtel "go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"

	"github.com/chaitin/panda-wiki/config"
	_ "github.com/chaitin/panda-wiki/docs"
	"github.com/chaitin/panda-wiki/log"
	PWMiddleware "github.com/chaitin/panda-wiki/middleware"
)

type HTTPServer struct {
	Echo *echo.Echo
}

type echoValidator struct {
	validator *validator.Validate
}

func (v *echoValidator) Validate(i any) error {
	if err := v.validator.Struct(i); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return nil
}

func NewEcho(
	logger *log.Logger,
	config *config.Config,
	pwMiddleware *PWMiddleware.ReadOnlyMiddleware,
	sessionMiddleware *PWMiddleware.SessionMiddleware,
) *echo.Echo {

	// Initialize Sentry if enabled
	if config.Sentry.Enabled && config.Sentry.DSN != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn: config.Sentry.DSN,
		})
		if err != nil {
			logger.Error("Failed to initialize Sentry", log.Error(err))
		} else {
			logger.Info("Sentry initialized successfully")
			// Flush buffered events on the default client before the program terminates.
			defer sentry.Flush(2 * time.Second)
		}
	}

	e := echo.New()
	e.HideBanner = true
	e.HidePort = true

	if os.Getenv("ENV") == "local" {
		e.Debug = true
		e.GET("/swagger/*", echoSwagger.WrapHandler)
	}
	// register validator
	e.Validator = &echoValidator{validator: validator.New()}

	// Add Sentry middleware if enabled
	if config.Sentry.Enabled && config.Sentry.DSN != "" {
		e.Use(sentryecho.New(sentryecho.Options{
			Repanic: true,
			Timeout: 5 * time.Second,
		}))
		sentry.CaptureMessage("It works!")
	}

	if config.GetBool("apm.enabled") {
		e.Use(middlewareOtel.Middleware(config.GetString("apm.service_name")))
	}

	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      true,
		LogLatency:  true,
		LogError:    true,
		LogMethod:   true,
		LogRemoteIP: true,
		HandleError: true, // forwards error to the global error handler, so it can decide appropriate status code
		LogValuesFunc: func(c echo.Context, v middleware.RequestLoggerValues) error {
			// Get the real IP address
			realIP := c.RealIP()
			method := c.Request().Method
			uri := v.URI
			status := v.Status
			latency := v.Latency.Milliseconds()
			if v.Error == nil {
				logger.LogAttrs(context.Background(), slog.LevelInfo, "REQUEST",
					slog.String("remote_ip", realIP),
					slog.String("method", method),
					slog.String("uri", uri),
					slog.Int("status", status),
					slog.Int("latency", int(latency)),
				)
			} else {
				logger.LogAttrs(context.Background(), slog.LevelError, "REQUEST_ERROR",
					slog.String("remote_ip", realIP),
					slog.String("method", method),
					slog.String("uri", uri),
					slog.Int("status", status),
					slog.Int("latency", int(latency)),
					slog.String("err", v.Error.Error()),
				)
			}
			return nil
		},
	}))

	e.Use(pwMiddleware.ReadOnly)
	e.Use(sessionMiddleware.Session())

	return e
}
