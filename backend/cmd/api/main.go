package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/chaitin/panda-wiki/health"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/setup"
)

// shutdownTimeout bounds how long in-flight requests, including streaming
// chat responses, are allowed to finish after a termination signal.
const shutdownTimeout = 30 * time.Second

// @title panda-wiki API
// @version 1.0
// @description panda-wiki API documentation
// @BasePath /
// @securityDefinitions.apikey	bearerAuth
// @in	header
// @name	Authorization
// @description	Type "Bearer" + a space + your token to authorize
func main() {
	app, err := createApp()
	if err != nil {
		panic(err)
	}
	// The self-signed certificate only exists for the bundled admin nginx, which
	// reads it from a shared volume. Deployment targets where the certificate
	// comes from elsewhere, or where the filesystem is read-only, turn it off.
	if app.Config.Setup.InitCert {
		if err := setup.CheckInitCert(); err != nil {
			panic(err)
		}
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if conn, ok := app.MQProducer.(health.Connection); ok {
		app.Health.RegisterMQProbe("nats", conn)
	}

	if app.Health.Enabled() {
		go func() {
			if err := app.Health.Start(ctx); err != nil {
				app.Logger.Error("health server stopped", log.Error(err))
			}
		}()
	}

	port := app.Config.HTTP.Port
	app.Logger.Info(fmt.Sprintf("Starting server on port %d", port))

	serveErr := make(chan error, 1)
	go func() {
		if err := app.HTTPServer.Echo.Start(fmt.Sprintf(":%d", port)); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
		}
	}()

	var exitCode int
	select {
	case err := <-serveErr:
		app.Logger.Error("http server stopped unexpectedly", log.Error(err))
		// Exit non-zero so Kubernetes treats this as a crash and restarts the
		// pod, rather than as a clean shutdown.
		exitCode = 1
	case <-ctx.Done():
		app.Logger.Info("termination signal received, draining in-flight requests")
	}

	// Stop the periodic reporter first so it cannot delay the drain.
	app.Telemetry.Stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := app.HTTPServer.Echo.Shutdown(shutdownCtx); err != nil {
		app.Logger.Error("graceful shutdown did not finish", log.Error(err))
	}
	if exitCode != 0 {
		os.Exit(exitCode)
	}
}
