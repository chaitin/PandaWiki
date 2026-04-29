package pg

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
	"gorm.io/gorm"
)

type DocumentFeedbackRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewDocumentFeedbackRepository(db *pg.DB, logger *log.Logger) *DocumentFeedbackRepository {
	return &DocumentFeedbackRepository{
		db:     db,
		logger: logger.WithModule("repo.pg.document_feedback"),
	}
}

func (r *DocumentFeedbackRepository) Create(ctx context.Context, row *domain.DocumentFeedback) error {
	return r.db.WithContext(ctx).Create(row).Error
}

// AuthSubmitterDisplay 根据 auths.id 与 kb_id 解析列表/快照用展示名（username 优先，否则 union_id）。
func (r *DocumentFeedbackRepository) AuthSubmitterDisplay(ctx context.Context, kbID, authIDStr string) string {
	id, err := strconv.ParseUint(strings.TrimSpace(authIDStr), 10, 64)
	if err != nil || id == 0 {
		return ""
	}
	var a domain.Auth
	if err := r.db.WithContext(ctx).
		Where("id = ? AND kb_id = ?", uint(id), kbID).
		First(&a).Error; err != nil {
		return ""
	}
	if u := strings.TrimSpace(a.UserInfo.Username); u != "" {
		return u
	}
	return strings.TrimSpace(a.UnionID)
}

type DocumentFeedbackListParams struct {
	KbID              string
	FeedbackCategory  string // 空表示不过滤
	Page              int
	PerPage           int
}

func (r *DocumentFeedbackRepository) List(ctx context.Context, p DocumentFeedbackListParams) ([]domain.DocumentFeedbackListItem, int64, error) {
	build := func() *gorm.DB {
		q := r.db.WithContext(ctx).Table("document_feedbacks").
			Joins("LEFT JOIN nodes ON document_feedbacks.node_id = nodes.id AND document_feedbacks.kb_id = nodes.kb_id").
			Joins(`LEFT JOIN auths AS feedback_auths ON document_feedbacks.user_id <> '' AND feedback_auths.id::text = document_feedbacks.user_id`).
			Where("document_feedbacks.kb_id = ?", p.KbID)
		if p.FeedbackCategory != "" {
			q = q.Where("document_feedbacks.feedback_category = ?", p.FeedbackCategory)
		}
		return q
	}

	var total int64
	if err := build().Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (p.Page - 1) * p.PerPage
	if offset < 0 {
		offset = 0
	}
	per := p.PerPage
	if per <= 0 {
		per = 20
	}

	var rows []domain.DocumentFeedbackListItem
	err := build().Select(`document_feedbacks.id, document_feedbacks.user_id,
		NULLIF(TRIM(COALESCE(
			NULLIF(TRIM(document_feedbacks.info->>'submitter_name'), ''),
			NULLIF(TRIM(feedback_auths.user_info->>'username'), ''),
			NULLIF(TRIM(feedback_auths.union_id), '')
		)), '') AS submitter_name,
		NULLIF(TRIM(document_feedbacks.info->>'remote_ip'), '') AS remote_ip,
		document_feedbacks.kb_id,
		document_feedbacks.node_id, nodes.name AS node_name, document_feedbacks.content,
		document_feedbacks.correction_suggestion, document_feedbacks.feedback_category,
		document_feedbacks.created_at`).
		Order("document_feedbacks.created_at DESC").
		Offset(offset).Limit(per).Scan(&rows).Error
	if err != nil {
		return nil, 0, err
	}
	return rows, total, nil
}

func (r *DocumentFeedbackRepository) DeleteByIDs(ctx context.Context, kbID string, ids []int64) error {
	if len(ids) == 0 {
		return fmt.Errorf("ids required")
	}
	return r.db.WithContext(ctx).
		Where("kb_id = ? AND id IN ?", kbID, ids).
		Delete(&domain.DocumentFeedback{}).Error
}
