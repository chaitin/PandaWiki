package usecase

import (
	"context"
	"github.com/chaitin/panda-wiki/domain"
)

type NodeUsecaseInterface interface {
	GetRecommendNodeList(ctx context.Context, req *domain.GetRecommendNodeListReq) ([]*domain.RecommendNodeListResp, error)
	// Add other methods here if AppUsecase starts using more of NodeUsecase's methods
}

// AppUsecaseInterface (though not requested, good for consistency if AppUsecase itself is a dependency for others)
// type AppUsecaseInterface interface {
// 	CreateApp(ctx context.Context, app *domain.App) error
// 	UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error
// 	DeleteApp(ctx context.Context, id string) error
// 	GetAppDetailByKBIDAndAppType(ctx context.Context, kbID string, appType domain.AppType) (*domain.AppDetailResp, error)
// 	GetWebAppInfo(ctx context.Context, kbID string) (*domain.AppInfoResp, error)
// }
