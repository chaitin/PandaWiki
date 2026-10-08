package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/chaitin/panda-wiki/health"
	"github.com/chaitin/panda-wiki/log"
)

func main() {
	app, err := createApp()
	if err != nil {
		panic(err)
	}

	// Cancelling this context is what stops the consumer handlers, so it has to
	// be wired to the termination signal rather than left as context.Background().
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if conn, ok := app.MQConsumer.(health.Connection); ok {
		app.Health.RegisterMQProbe("nats", conn)
	}

	if app.Health.Enabled() {
		go func() {
			if err := app.Health.Start(ctx); err != nil {
				app.Logger.Error("health server stopped", log.Error(err))
			}
		}()
	}

	if err := app.MQConsumer.StartConsumerHandlers(ctx); err != nil {
		// This only returns on cancellation, so a non-nil error is unexpected.
		app.Logger.Error("consumer handlers stopped unexpectedly", log.Error(err))
		os.Exit(1)
	}

	// Order matters: stop scheduling new cron jobs before tearing the
	// subscriptions down, so no job starts against a closed connection.
	app.StatCronHandler.Stop()
	if err := app.MQConsumer.Close(); err != nil {
		// Reported, but not as a crash: this runs because a signal asked the
		// process to stop, and JetStream redelivers anything left unacked.
		app.Logger.Error("failed to close the message queue consumer", log.Error(err))
	}
}
