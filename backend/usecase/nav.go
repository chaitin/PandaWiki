package usecase

import (
	"context"
	"errors"

	"github.com/google/uuid"

	v1 "github.com/chaitin/panda-wiki/api/nav/v1"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/mq"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type NavUsecase struct {
	navRepo  *pg.NavRepository
	nodeRepo *pg.NodeRepository
	ragRepo  *mq.RAGRepository
	logger   *log.Logger
}

func NewNavUsecase(
	navRepo *pg.NavRepository,
	nodeRepo *pg.NodeRepository,
	ragRepo *mq.RAGRepository,
	logger *log.Logger,
) *NavUsecase {
	return &NavUsecase{
		navRepo:  navRepo,
		nodeRepo: nodeRepo,
		ragRepo:  ragRepo,
		logger:   logger.WithModule("usecase.nav"),
	}
}

func (u *NavUsecase) GetList(ctx context.Context, kbID string) ([]v1.NavListResp, error) {
	navs, err := u.navRepo.GetList(ctx, kbID)
	if err != nil {
		return nil, err
	}
	return navs, nil
}

func (u *NavUsecase) Add(ctx context.Context, req *v1.NavAddReq) error {
	if req.Position != nil && (*req.Position > domain.MaxPosition || *req.Position < 0) {
		return errors.New("user specify position out of range")
	}

	nav := &domain.Nav{
		ID:   uuid.New().String(),
		KbID: req.KbId,
		Name: req.Name,
	}

	return u.navRepo.Create(ctx, nav, req.Position)
}

func (u *NavUsecase) Move(ctx context.Context, req *v1.NavMoveReq) error {
	return u.navRepo.Move(ctx, req.KbId, req.ID, req.PrevID, req.NextID)
}

func (u *NavUsecase) Delete(ctx context.Context, req *v1.NavDeleteReq) error {
	nodeIDs, err := u.nodeRepo.GetNodeIDsByNavId(ctx, req.KbId, req.ID)
	if err != nil {
		return err
	}

	if len(nodeIDs) > 0 {
		docIDs, err := u.nodeRepo.Delete(ctx, req.KbId, nodeIDs)
		if err != nil {
			return err
		}
		nodeVectorContentRequests := make([]*domain.NodeReleaseVectorRequest, 0)
		for _, docID := range docIDs {
			nodeVectorContentRequests = append(nodeVectorContentRequests, &domain.NodeReleaseVectorRequest{
				KBID:   req.KbId,
				DocID:  docID,
				Action: "delete",
			})
		}
		if err := u.ragRepo.AsyncUpdateNodeReleaseVector(ctx, nodeVectorContentRequests); err != nil {
			return err
		}
	}

	return u.navRepo.Delete(ctx, req.KbId, req.ID)
}

func (u *NavUsecase) Update(ctx context.Context, req *v1.NavUpdateReq) error {
	return u.navRepo.Update(ctx, req.KbId, req.ID, req.Name)
}
