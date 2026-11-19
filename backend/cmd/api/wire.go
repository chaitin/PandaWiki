//go:build wireinject

package main

import (
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/config"
	share "github.com/chaitin/panda-wiki/handler/share"
	v1 "github.com/chaitin/panda-wiki/handler/v1"
	"github.com/chaitin/panda-wiki/health"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/server/http"
	"github.com/chaitin/panda-wiki/telemetry"
)

func createApp() (*App, error) {
	wire.Build(
		wire.Struct(new(App), "*"),
		wire.NewSet(
			config.ProviderSet,
			log.ProviderSet,
			telemetry.ProviderSet,

			http.ProviderSet,
			health.ProviderSet,
			v1.ProviderSet,
			share.ProviderSet,
		),
	)
	return &App{}, nil
}

type App struct {
	HTTPServer    *http.HTTPServer
	Handlers      *v1.APIHandlers
	ShareHandlers *share.ShareHandler
	Config        *config.Config
	Logger        *log.Logger
	Telemetry     *telemetry.Client
	Health        *health.Server
	MQProducer    mq.MQProducer
}
