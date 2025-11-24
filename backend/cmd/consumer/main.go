package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	app, err := createApp()
	if err != nil {
		panic(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		cancel()
	}()

	if err := app.MQConsumer.StartConsumerHandlers(ctx); err != nil {
		panic(err)
	}

	if err := app.MQConsumer.Close(); err != nil {
		panic(err)
	}
}
