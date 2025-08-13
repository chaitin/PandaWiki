package pg

import (
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/store/pg"
)

var ProviderSet = wire.NewSet(
	pg.ProviderSet,

	NewNodeRepository,
	NewAppRepository,
	NewConversationRepository,
	NewUserRepository,
	NewUserAccessRepository,
	NewModelRepository,
	NewKnowledgeBaseRepository,
	NewStatRepository,
	NewCommentRepository,
	NewPromptRepo,
	NewBlockWordRepo,
	NewAuthRepo,
)
