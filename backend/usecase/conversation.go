package usecase

import (
	"context"
	"fmt"
	"regexp"

	"github.com/samber/lo"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/cache"
	"github.com/chaitin/panda-wiki/repo/ipdb"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type ConversationUsecase struct {
	repo         *pg.ConversationRepository
	nodeRepo     *pg.NodeRepository
	geoCacheRepo *cache.GeoRepo
	logger       *log.Logger
	ipRepo       *ipdb.IPAddressRepo
	authRepo     *pg.AuthRepo
}

func NewConversationUsecase(
	repo *pg.ConversationRepository,
	nodeRepo *pg.NodeRepository,
	geoCacheRepo *cache.GeoRepo,
	logger *log.Logger,
	ipRepo *ipdb.IPAddressRepo,
	authRepo *pg.AuthRepo,
) *ConversationUsecase {
	return &ConversationUsecase{
		repo:         repo,
		nodeRepo:     nodeRepo,
		geoCacheRepo: geoCacheRepo,
		ipRepo:       ipRepo,
		authRepo:     authRepo,
		logger:       logger.WithModule("usecase.conversation"),
	}
}

func (u *ConversationUsecase) CreateChatConversationMessage(ctx context.Context, kbID string, conversation *domain.ConversationMessage) error {
	references := extractReferencesBlock(conversation.ID, conversation.AppID, conversation.Content)
	return u.repo.CreateConversationMessage(ctx, conversation, references)
}

func (u *ConversationUsecase) GetConversationList(ctx context.Context, request *domain.ConversationListReq) (*domain.PaginatedResult[[]*domain.ConversationListItem], error) {
	conversations, total, err := u.repo.GetConversationList(ctx, request)
	if err != nil {
		return nil, err
	}
	// get feedback info
	conversationIDs := make([]string, 0, len(conversations))
	// get all conversation authID
	authIDs := make([]uint, 0, len(conversations))

	for _, c := range conversations {
		conversationIDs = append(conversationIDs, c.ID)
		// 检查 s_id 是否有效，避免查询无效数据
		if c.Info.UserInfo.AuthUserID != 0 {
			authIDs = append(authIDs, c.Info.UserInfo.AuthUserID)
		}
	}

	// 遍历拿到的c，去数据库里面搜索最新的用户回复
	feedbackMap, err := u.repo.GetConversationFeedBackInfoByIDs(ctx, conversationIDs)
	if err != nil {
		u.logger.Error("get latest feedback by conversation id failed", log.Error(err))
	}
	// get user info according authIDs
	authMap, err := u.authRepo.GetAuthUserinfoByIDs(ctx, authIDs)
	if err != nil {
		u.logger.Error("get user info failed", log.Error(err))
	}

	// get ip address
	ipAddressMap := make(map[string]*domain.IPAddress)
	lo.Map(conversations, func(conversation *domain.ConversationListItem, _ int) *domain.ConversationListItem {
		if _, ok := ipAddressMap[conversation.RemoteIP]; !ok {
			ipAddress, err := u.ipRepo.GetIPAddress(ctx, conversation.RemoteIP)
			if err != nil {
				u.logger.Error("get ip address failed", log.Error(err), log.String("ip", conversation.RemoteIP))
				return conversation
			}
			ipAddressMap[conversation.RemoteIP] = ipAddress
			conversation.IPAddress = ipAddress
		} else {
			conversation.IPAddress = ipAddressMap[conversation.RemoteIP]
		}
		if _, ok := feedbackMap[conversation.ID]; ok {
			conversation.FeedBackInfo = feedbackMap[conversation.ID]
		}
		if _, ok := authMap[conversation.Info.UserInfo.AuthUserID]; ok {
			conversation.Info.UserInfo = domain.UserInfo{
				NickName: authMap[conversation.Info.UserInfo.AuthUserID].AuthUserInfo.Username,
				Avatar:   authMap[conversation.Info.UserInfo.AuthUserID].AuthUserInfo.AvatarUrl,
				Email:    authMap[conversation.Info.UserInfo.AuthUserID].AuthUserInfo.Email,
			}
		}
		return conversation
	})
	return domain.NewPaginatedResult(conversations, total), nil
}

func (u *ConversationUsecase) GetConversationDetail(ctx context.Context, conversationID string) (*domain.ConversationDetailResp, error) {
	conversation, err := u.repo.GetConversationDetail(ctx, "", conversationID)
	if err != nil {
		return nil, err
	}
	// get ip address
	ipAddress, err := u.ipRepo.GetIPAddress(ctx, conversation.RemoteIP)
	if err != nil {
		u.logger.Error("get ip address failed", log.Error(err), log.String("ip", conversation.RemoteIP))
	} else {
		conversation.IPAddress = ipAddress
	}
	// get messages
	messages, err := u.repo.GetConversationMessagesByID(ctx, conversationID)
	if err != nil {
		return nil, err
	}
	conversation.Messages = messages
	// get references
	references, err := u.repo.GetConversationReferences(ctx, conversationID)
	if err != nil {
		return nil, err
	}
	conversation.References = references
	return conversation, nil
}

func extractReferencesBlock(conversationID, appID, text string) []*domain.ConversationReference {
	// match whole reference block
	reBlock := regexp.MustCompile(`(?ms)((?:>|\\u003e)\s*\[\d+\]\.\s*\[.*?\]\(.*?\)\s*\n?)+$`)
	// find the last match index
	lastIndex := -1
	allMatches := reBlock.FindAllStringIndex(text, -1)
	if len(allMatches) > 0 {
		lastIndex = allMatches[len(allMatches)-1][0]
	}

	if lastIndex == -1 {
		return nil
	}

	// extract all references in the last reference block
	block := text[lastIndex:]
	reLine := regexp.MustCompile(`(?m)^(?:>|\\u003e)\s*\[(\d+)\]\.\s*\[(.*?)\]\((.*?)\)`)
	matches := reLine.FindAllStringSubmatch(block, -1)

	refs := make([]*domain.ConversationReference, 0)
	for _, match := range matches {
		if len(match) == 4 {
			refs = append(refs, &domain.ConversationReference{
				Name: match[2],
				URL:  match[3],

				ConversationID: conversationID,
				AppID:          appID,
			})
		}
	}
	return refs
}

func (u *ConversationUsecase) ValidateConversationNonce(ctx context.Context, conversationID, nonce string) error {
	return u.repo.ValidateConversationNonce(ctx, conversationID, nonce)
}

func (u *ConversationUsecase) CreateConversation(ctx context.Context, conversation *domain.Conversation) error {
	if err := u.repo.CreateConversation(ctx, conversation); err != nil {
		return err
	}
	remoteIP := conversation.RemoteIP
	ipAddress, err := u.ipRepo.GetIPAddress(ctx, remoteIP)
	if err != nil {
		u.logger.Warn("get ip address failed", log.Error(err), log.String("ip", remoteIP), log.String("conversation_id", conversation.ID))
	} else {
		location := fmt.Sprintf("%s|%s|%s", ipAddress.Country, ipAddress.Province, ipAddress.City)
		if err := u.geoCacheRepo.SetGeo(ctx, conversation.KBID, location); err != nil {
			u.logger.Warn("set geo cache failed", log.Error(err), log.String("conversation_id", conversation.ID), log.String("ip", remoteIP))
		}
	}
	return nil
}

func (u *ConversationUsecase) FeedBack(ctx context.Context, feedback *domain.FeedbackRequest) error {
	// 先查询数据库，看看目前message的信息
	messages, err := u.repo.GetConversationMessagesDetailByID(ctx, feedback.MessageId)
	if err != nil {
		return err
	}
	u.logger.Debug("feedback info", log.Any("feedback_info", messages.Info))

	// 后端校验一下，只是允许用户进行一次投票
	if messages.Info.Score == 0 {
		// 用户可以提供建议
		if err := u.repo.UpdateMessageFeedback(ctx, feedback); err != nil {
			return err
		}
	} else {
		return fmt.Errorf("already voted for this message, please do not vote again")
	}
	return nil
}

func (u *ConversationUsecase) GetMessageList(ctx context.Context, req *domain.MessageListReq) (*domain.PaginatedResult[[]*domain.ConversationMessageListItem], error) {
	total, messageList, err := u.repo.GetMessageFeedBackList(ctx, req)
	if err != nil {
		return nil, err
	}
	// get ip address
	ipAddressMap := make(map[string]*domain.IPAddress)
	lo.Map(messageList, func(message *domain.ConversationMessageListItem, _ int) *domain.ConversationMessageListItem {
		if _, ok := ipAddressMap[message.RemoteIP]; !ok {
			ipAddress, err := u.ipRepo.GetIPAddress(ctx, message.RemoteIP)
			if err != nil {
				u.logger.Error("get ip address failed", log.Error(err), log.String("ip", message.RemoteIP))
				return message
			}
			ipAddressMap[message.RemoteIP] = ipAddress
			message.IPAddress = ipAddress
		} else {
			message.IPAddress = ipAddressMap[message.RemoteIP]
		}
		return message
	})

	return domain.NewPaginatedResult(messageList, uint64(total)), nil
}

func (u *ConversationUsecase) GetMessageDetail(ctx context.Context, messageId string) (*domain.ConversationMessage, error) {
	message, err := u.repo.GetConversationMessagesDetailByID(ctx, messageId)
	if err != nil {
		return nil, err
	}
	return message, nil
}

func (u *ConversationUsecase) GetShareConversationDetail(ctx context.Context, kbID, conversationID string) (*domain.ShareConversationDetailResp, error) {
	conversation, err := u.repo.GetConversationDetail(ctx, kbID, conversationID)
	if err != nil {
		return nil, err
	}
	// get messages
	messages, err := u.repo.GetConversationMessagesByID(ctx, conversationID)
	if err != nil {
		return nil, err
	}
	var shareMessages []*domain.ShareConversationMessage
	for _, message := range messages {
		shareMessages = append(shareMessages, &domain.ShareConversationMessage{
			Role:      message.Role,
			Content:   message.Content,
			CreatedAt: message.CreatedAt,
		})
	}
	shareConversationDetail := domain.ShareConversationDetailResp{
		ID:        conversation.ID,
		Subject:   conversation.Subject,
		CreatedAt: conversation.CreatedAt,

		Messages: shareMessages,
	}
	conversation.Messages = messages
	return &shareConversationDetail, nil
}
