//go:build wireinject

package main

import (
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/config"
	handler "github.com/chaitin/panda-wiki/handler/mq"
	"github.com/chaitin/panda-wiki/health"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
)

func createApp() (*App, error) {
	wire.Build(
		wire.Struct(new(App), "*"),
		wire.NewSet(
			config.ProviderSet,
			log.ProviderSet,
			handler.ProviderSet,
			health.ProviderSet,
		),
	)
	return &App{}, nil
}

type App struct {
	MQConsumer      mq.MQConsumer
	Config          *config.Config
	MQHandlers      *handler.MQHandlers
	StatCronHandler *handler.CronHandler
	Health          *health.Server
	Logger          *log.Logger
}
