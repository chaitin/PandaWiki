package health

import "github.com/google/wire"

var ProviderSet = wire.NewSet(
	NewChecker,
	NewServer,
)
