package usecase

import (
	"context"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type AppUsecase struct {
	repo             pg.AppRepositoryInterface // Changed to interface
	nodeUsecase      NodeUsecaseInterface      // Changed to interface
	conversationRepo *pg.ConversationRepository // Assuming this remains concrete for now, or needs similar refactoring
	logger           *log.Logger
	config           *config.Config
}

func NewAppUsecase(
	repo pg.AppRepositoryInterface, // Changed to interface
	nodeUsecase NodeUsecaseInterface, // Changed to interface
	conversationRepo *pg.ConversationRepository, // Assuming this remains concrete for now
	logger *log.Logger,
	config *config.Config,
) *AppUsecase {
	return &AppUsecase{
		repo:             repo,
		nodeUsecase:      nodeUsecase,
		conversationRepo: conversationRepo,
		logger:           logger.WithModule("usecase.app"),
		config:           config,
	}
}

func (u *AppUsecase) CreateApp(ctx context.Context, app *domain.App) error {
	return u.repo.CreateApp(ctx, app)
}

func (u *AppUsecase) UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error {
	if err := u.repo.UpdateApp(ctx, id, appRequest); err != nil {
		return err
	}
	return nil
}

func (u *AppUsecase) DeleteApp(ctx context.Context, id string) error {
	return u.repo.DeleteApp(ctx, id)
}

func (u *AppUsecase) GetAppDetailByKBIDAndAppType(ctx context.Context, kbID string, appType domain.AppType) (*domain.AppDetailResp, error) {
	app, err := u.repo.GetAppDetailByKBIDAndType(ctx, kbID, appType)
	if err != nil {
		return nil, err
	}
	appDetailResp := &domain.AppDetailResp{
		ID:   app.ID,
		KBID: app.KBID,
		Name: app.Name,
		Type: app.Type,
	}
	appDetailResp.Settings = domain.AppSettingsResp{
		Title:              app.Settings.Title,
		Icon:               app.Settings.Icon,
		Btns:               app.Settings.Btns,
		WelcomeStr:         app.Settings.WelcomeStr,
		SearchPlaceholder:  app.Settings.SearchPlaceholder,
		RecommendQuestions: app.Settings.RecommendQuestions,
		RecommendNodeIDs:   app.Settings.RecommendNodeIDs,
		Desc:               app.Settings.Desc,
		Keyword:            app.Settings.Keyword,
		AutoSitemap:        app.Settings.AutoSitemap,
		HeadCode:           app.Settings.HeadCode,
		BodyCode:           app.Settings.BodyCode,
	}
	if len(app.Settings.RecommendNodeIDs) > 0 {
		nodes, err := u.nodeUsecase.GetRecommendNodeList(ctx, &domain.GetRecommendNodeListReq{
			KBID:    kbID,
			NodeIDs: app.Settings.RecommendNodeIDs,
		})
		if err != nil {
			return nil, err
		}
		appDetailResp.RecommendNodes = nodes
	}
	return appDetailResp, nil
}

func (u *AppUsecase) GetWebAppInfo(ctx context.Context, kbID string) (*domain.AppInfoResp, error) {
	app, err := u.repo.GetAppDetailByKBIDAndType(ctx, kbID, domain.AppTypeWeb)
	if err != nil {
		return nil, err
	}
	appInfo := &domain.AppInfoResp{
		Name: app.Name,
		Settings: domain.AppSettingsResp{
			Title:              app.Settings.Title,
			Icon:               app.Settings.Icon,
			Btns:               app.Settings.Btns,
			WelcomeStr:         app.Settings.WelcomeStr,
			SearchPlaceholder:  app.Settings.SearchPlaceholder,
			RecommendQuestions: app.Settings.RecommendQuestions,
			RecommendNodeIDs:   app.Settings.RecommendNodeIDs,
			Desc:               app.Settings.Desc,
			Keyword:            app.Settings.Keyword,
			AutoSitemap:        app.Settings.AutoSitemap,
			HeadCode:           app.Settings.HeadCode,
			BodyCode:           app.Settings.BodyCode,
		},
	}
	if len(app.Settings.RecommendNodeIDs) > 0 {
		nodes, err := u.nodeUsecase.GetRecommendNodeList(ctx, &domain.GetRecommendNodeListReq{
			KBID:    kbID,
			NodeIDs: app.Settings.RecommendNodeIDs,
		})
		if err != nil {
			return nil, err
		}
		appInfo.RecommendNodes = nodes
	}
	return appInfo, nil
}
