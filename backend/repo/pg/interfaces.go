package pg

import (
	"context"
	"github.com/chaitin/panda-wiki/domain"
)

type AppRepositoryInterface interface {
	CreateApp(ctx context.Context, app *domain.App) error
	UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error
	DeleteApp(ctx context.Context, id string) error
	GetAppDetailByKBIDAndType(ctx context.Context, kbID string, appType domain.AppType) (*domain.App, error)
	// GetAppDetail is used by AppRepository but not directly by AppUsecase, so it's optional here for now
	// based on current AppUsecase usage. Let's add it to be complete for AppRepository.
	GetAppDetail(ctx context.Context, id string) (*domain.App, error)
}
