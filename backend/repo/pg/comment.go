package pg

import (
	"context"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type CommentRepository struct {
	db     *pg.DB
	logger *log.Logger
}

func NewCommentRepository(db *pg.DB, logger *log.Logger) *CommentRepository {
	return &CommentRepository{db: db, logger: logger.WithModule("repo.pg.comment")}
}

func (r *CommentRepository) CreateComment(ctx context.Context, comment *domain.Comment) error {
	// 插入到数据库中
	if err := r.db.WithContext(ctx).Create(comment).Error; err != nil {
		return err
	}
	return nil
}

func (r *CommentRepository) GetCommentList(ctx context.Context, nodeID string) ([]*domain.ShareCommentListItem, int64, error) {
	// 按照时间排序来查询node_id的comments
	var comments []*domain.ShareCommentListItem
	query := r.db.WithContext(ctx).Model(&domain.Comment{}).Where("node_id = ?", nodeID)

	if domain.GetBaseEditionLimitation(ctx).AllowCommentAudit {
		query = query.Where("status = ?", domain.CommentStatusAccepted) //accepted
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at DESC").Find(&comments).Error; err != nil {
		return nil, 0, err
	}

	return comments, count, nil

}

func (r *CommentRepository) GetCommentListByKbID(ctx context.Context, req *domain.CommentListReq, edition consts.LicenseEdition) ([]*domain.CommentListItem, int64, error) {
	comments := []*domain.CommentListItem{}
	query := r.db.WithContext(ctx).Model(&domain.Comment{}).Where("comments.kb_id = ?", req.KbID)
	var count int64
	if req.Status == nil {
		if err := query.Count(&count).Error; err != nil {
			return nil, 0, err
		}
	} else {
		if domain.GetBaseEditionLimitation(ctx).AllowCommentAudit {
			query = query.Where("comments.status = ?", *req.Status)
		}
		// 按照时间排序来查询kb_id的comments ->reject pending accepted
		if err := query.Count(&count).Error; err != nil {
			return nil, 0, err
		}
	}

	// select
	if err := query.
		Joins("left join nodes on comments.node_id = nodes.id").
		Select("comments.*, nodes.name as node_name, nodes.type as app_type").
		Offset(req.Offset()).
		Limit(req.Limit()).
		Order("comments.created_at DESC").
		Find(&comments).Error; err != nil {
		return nil, 0, err
	}

	// success
	return comments, count, nil

}

func (r *CommentRepository) CommentDelete(ctx context.Context, kbID string, commentIDs []string) error {
	query := r.db.WithContext(ctx).Model(&domain.Comment{}).
		Where("kb_id = ? AND id IN (?)", kbID, commentIDs)

	if err := query.Delete(&domain.Comment{}).Error; err != nil {
		return err
	}
	return nil
}
