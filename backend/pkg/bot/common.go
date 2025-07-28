package bot

import (
	"context"

	"github.com/chaitin/panda-wiki/domain"
)

type GetQAFun func(ctx context.Context, msg string, info domain.ConversationInfo, ConversationID string) (chan string, error)
