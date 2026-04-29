package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	repoPg "github.com/chaitin/panda-wiki/repo/pg"
)

type DocumentFeedbackUsecase struct {
	repo       *repoPg.DocumentFeedbackRepository
	nodeRepo   *repoPg.NodeRepository
	appUsecase *AppUsecase
	logger     *log.Logger
}

func NewDocumentFeedbackUsecase(
	repo *repoPg.DocumentFeedbackRepository,
	nodeRepo *repoPg.NodeRepository,
	appUsecase *AppUsecase,
	logger *log.Logger,
) *DocumentFeedbackUsecase {
	return &DocumentFeedbackUsecase{
		repo:       repo,
		nodeRepo:   nodeRepo,
		appUsecase: appUsecase,
		logger:     logger.WithModule("usecase.document_feedback"),
	}
}

type CreateDocumentFeedbackShareInput struct {
	KbID                 string
	NodeID               string
	Category             string
	Content              string
	CorrectionSuggestion string
	RemoteIP             string
	UserID               string
}

func (u *DocumentFeedbackUsecase) CreateFromShare(ctx context.Context, in CreateDocumentFeedbackShareInput) error {
	category := in.Category
	if category == "" {
		category = domain.DocumentFeedbackCategoryDocument
	}
	if category != domain.DocumentFeedbackCategoryDocument && category != domain.DocumentFeedbackCategoryGeneral {
		return fmt.Errorf("invalid feedback_category")
	}

	content := strings.TrimSpace(in.Content)
	if content == "" {
		return fmt.Errorf("content is required")
	}
	if len(content) > 8000 {
		return fmt.Errorf("content too long")
	}

	app, err := u.appUsecase.GetAppDetailByKBIDAndAppType(ctx, in.KbID, domain.AppTypeWeb)
	if err != nil {
		return fmt.Errorf("app not found: %w", err)
	}

	nodeID := strings.TrimSpace(in.NodeID)
	if category == domain.DocumentFeedbackCategoryGeneral {
		nodeID = ""
		if strings.TrimSpace(in.UserID) == "" {
			return fmt.Errorf("请先使用账号登录后再提交站点问题反馈")
		}
	} else {
		if nodeID == "" {
			return fmt.Errorf("node_id is required for document feedback")
		}
		if app.Settings.DocumentFeedBackIsEnabled != nil && !*app.Settings.DocumentFeedBackIsEnabled {
			return fmt.Errorf("document feedback is disabled")
		}
		if _, err := u.nodeRepo.GetByID(ctx, nodeID, in.KbID); err != nil {
			return fmt.Errorf("invalid node_id")
		}
	}

	info := map[string]any{"remote_ip": in.RemoteIP}
	if snap := strings.TrimSpace(u.repo.AuthSubmitterDisplay(ctx, in.KbID, in.UserID)); snap != "" {
		info["submitter_name"] = snap
	}
	infoBytes, _ := json.Marshal(info)

	row := &domain.DocumentFeedback{
		UserID:               in.UserID,
		KBID:                 in.KbID,
		NodeID:               nodeID,
		Content:              content,
		CorrectionSuggestion: strings.TrimSpace(in.CorrectionSuggestion),
		Info:                 infoBytes,
		FeedbackCategory:     category,
	}
	return u.repo.Create(ctx, row)
}

func (u *DocumentFeedbackUsecase) ListForAdmin(ctx context.Context, kbID, category string, page, perPage int) ([]domain.DocumentFeedbackListItem, int64, error) {
	return u.repo.List(ctx, repoPg.DocumentFeedbackListParams{
		KbID:             kbID,
		FeedbackCategory: category,
		Page:             page,
		PerPage:          perPage,
	})
}

func (u *DocumentFeedbackUsecase) DeleteByIDs(ctx context.Context, kbID string, ids []int64) error {
	return u.repo.DeleteByIDs(ctx, kbID, ids)
}
