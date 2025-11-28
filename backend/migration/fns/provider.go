package fns

import (
	"github.com/google/wire"
)

var ProviderSet = wire.NewSet(
	NewMigrationNodeVersion,
	NewMigrationCreateBotAuth,
)
