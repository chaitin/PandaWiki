package pg

import (
	"context"

	"github.com/cloudwego/eino/schema"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type ConversationRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewConversationRepository(db *pg.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) CreateConversationMessage(ctx context.Context, conversationMessage *domain.ConversationMessage, references []*domain.ConversationReference) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(conversationMessage).Error; err != nil {
			return err
		}
		if len(references) > 0 {
			return tx.Create(references).Error
		}
		return nil
	})
}

func (r *ConversationRepository) CreateConversation(ctx context.Context, conversation *domain.Conversation) error {
	return r.db.WithContext(ctx).Create(conversation).Error
}

func (r *ConversationRepository) GetConversationList(ctx context.Context, request *domain.ConversationListReq) ([]*domain.ConversationListItem, uint64, error) {
	conversations := []*domain.ConversationListItem{}
	query := r.db.WithContext(ctx).
		Model(&domain.Conversation{}).
		Where("conversations.kb_id = ?", request.KBID)

	if request.AppID != nil && *request.AppID != "" {
		query = query.Where("conversations.app_id = ?", *request.AppID)
	}
	if request.Subject != nil && *request.Subject != "" {
		query = query.Where("conversations.subject like ?", "%"+*request.Subject+"%")
	}
	if request.RemoteIP != nil && *request.RemoteIP != "" {
		query = query.Where("conversations.remote_ip like ?", "%"+*request.RemoteIP+"%")
	}
	var count int64
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}
	if err := query.
		Joins("left join apps on conversations.app_id = apps.id").
		Select("conversations.*, apps.name as app_name, apps.type as app_type").
		Offset(request.Offset()).
		Limit(request.Limit()).
		Order("conversations.created_at DESC").
		Find(&conversations).Error; err != nil {
		return nil, 0, err
	}
	return conversations, uint64(count), nil
}

func (r *ConversationRepository) GetConversationDetail(ctx context.Context, conversationID string) (*domain.ConversationDetailResp, error) {
	conversation := &domain.ConversationDetailResp{}
	if err := r.db.WithContext(ctx).
		Model(&domain.Conversation{}).
		Where("id = ?", conversationID).
		First(conversation).Error; err != nil {
		return nil, err
	}
	return conversation, nil
}

func (r *ConversationRepository) GetConversationReferences(ctx context.Context, conversationID string) ([]*domain.ConversationReference, error) {
	references := []*domain.ConversationReference{}
	if err := r.db.WithContext(ctx).
		Model(&domain.ConversationReference{}).
		Where("conversation_id = ?", conversationID).
		Find(&references).Error; err != nil {
		return nil, err
	}
	return references, nil
}

func (r *ConversationRepository) GetConversationMessagesByID(ctx context.Context, conversationID string) ([]*domain.ConversationMessage, error) {
	messages := []*domain.ConversationMessage{}
	if err := r.db.WithContext(ctx).
		Model(&domain.ConversationMessage{}).
		Where("conversation_id = ?", conversationID).
		Order("created_at asc").
		Find(&messages).Error; err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *ConversationRepository) ValidateConversationNonce(ctx context.Context, conversationID, nonce string) error {
	conversation := &domain.Conversation{}
	if err := r.db.WithContext(ctx).
		Model(&domain.Conversation{}).
		Where("id = ?", conversationID).
		Where("nonce = ?", nonce).
		First(&conversation).Error; err != nil {
		return err
	}
	return nil
}

func (r *ConversationRepository) GetConversationDistribution(ctx context.Context, kbID string) ([]*domain.ConversationDistributionResp, error) {
	var distribution []*domain.ConversationDistributionResp
	if err := r.db.WithContext(ctx).
		Model(&domain.Conversation{}).
		Select("app_id", "COUNT(*) AS count").
		Where("kb_id = ?", kbID).
		Where("created_at > now() - interval '24h'").
		Group("app_id").
		Find(&distribution).Error; err != nil {
		return nil, err
	}
	return distribution, nil
}

func (r *ConversationRepository) GetConversationCount(ctx context.Context, kbID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&domain.Conversation{}).
		Where("kb_id = ?", kbID).
		Where("created_at > now() - interval '24h'").
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *ConversationRepository) GetConversationMessagesDetailByID(ctx context.Context, messageId string) (*domain.ConversationMessage, error) {
	message := &domain.ConversationMessage{}
	if err := r.db.WithContext(ctx).
		Model(&domain.ConversationMessage{}).
		Where("id = ?", messageId).
		First(&message).Error; err != nil {
		return nil, err
	}
	return message, nil
}

// 更新反馈信息
func (r *ConversationRepository) UpdateMessageFeedback(ctx context.Context, feedback *domain.FeedbackRequest) error {
	// 更新字段
	feedbackInfo := domain.FeedBackInfo{
		Score:           feedback.Score,
		FeedbackType:    feedback.Type,
		FeedbackContent: feedback.FeedbackContent,
	}

	// 更新消息的反馈信息
	if err := r.db.WithContext(ctx).Model(&domain.ConversationMessage{}).
		Where("id = ?", feedback.MessageId).
		Update("info", feedbackInfo).Error; err != nil {
		return err
	}
	return nil
}

func (r *ConversationRepository) GetConversationFeedBackInfoByIDs(ctx context.Context, conversationIDs []string) (map[string]*domain.FeedBackInfo, error) {
	if len(conversationIDs) == 0 {
		return nil, nil
	}

	messages := []domain.ConversationMessage{}
	if err := r.db.WithContext(ctx).Model(&domain.ConversationMessage{}).
		Where("conversation_id IN (?)", conversationIDs).
		Where("info is not null AND info->>'score' != ?", "0").
		Where("role = ?", schema.Assistant).
		Order("created_at ASC").
		Select("conversation_id, info").Find(&messages).Error; err != nil {
		r.logger.Error("GetConversationFeedBackInfoByIDs failed, error:", log.Error(err))
		return nil, err
	}
	result := make(map[string]*domain.FeedBackInfo, 0)
	for _, message := range messages {
		result[message.ConversationID] = &message.Info
	}
	return result, nil
}
