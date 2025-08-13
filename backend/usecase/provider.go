package usecase

import (
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/repo/ipdb"
	mqRepo "github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/rag"
	"github.com/chaitin/panda-wiki/store/s3"
)

var ProviderSet = wire.NewSet(
	pg.ProviderSet,
	mqRepo.ProviderSet,
	ipdb.ProviderSet,
	rag.ProviderSet,
	s3.ProviderSet,

	NewLLMUsecase,
	NewNodeUsecase,
	NewAppUsecase,
	NewConversationUsecase,
	NewUserUsecase,
	NewModelUsecase,
	NewKnowledgeBaseUsecase,
	NewChatUsecase,
	NewCrawlerUsecase,
	NewCreationUsecase,
	NewNotionUsecase,
	NewEpubUsecase,
	NewFileUsecase,
	NewWikiJSUsecase,
	NewSitemapUsecase,
	NewFeishuUseCase,
	NewStatUseCase,
	NewConfluenceUsecase,
	NewCommentUsecase,
	NewYuqueUsecase,
	NewShiYuanUsecase,
)
