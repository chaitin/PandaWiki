package share

import (
	"github.com/google/wire"

	"github.com/chaitin/panda-wiki/pkg/captcha"
)

type ShareHandler struct {
	ShareNodeHandler         *ShareNodeHandler
	ShareAppHandler          *ShareAppHandler
	ShareChatHandler         *ShareChatHandler
	ShareSitemapHandler      *ShareSitemapHandler
	ShareStatHandler         *ShareStatHandler
	ShareCommentHandler      *ShareCommentHandler
	ShareAuthHandler         *ShareAuthHandler
	ShareConversationHandler *ShareConversationHandler
	ShareWechatHandler       *ShareWechatHandler
	ShareCaptchaHandler      *ShareCaptchaHandler
	OpenapiV1Handler         *OpenapiV1Handler
	ShareCommonHandler            *ShareCommonHandler
	ShareDocumentFeedbackHandler *ShareDocumentFeedbackHandler
}

var ProviderSet = wire.NewSet(
	captcha.NewCaptcha,

	NewShareNodeHandler,
	NewShareAppHandler,
	NewShareChatHandler,
	NewShareSitemapHandler,
	NewShareStatHandler,
	NewShareCommentHandler,
	NewShareAuthHandler,
	NewShareConversationHandler,
	NewShareWechatHandler,
	NewShareCaptchaHandler,
	NewShareCommonHandler,
	NewShareDocumentFeedbackHandler,
	NewOpenapiV1Handler,

	wire.Struct(new(ShareHandler), "*"),
)
