package usecase

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
	"github.com/chaitin/panda-wiki/pkg/bot/dingtalk"
	"github.com/chaitin/panda-wiki/pkg/bot/discord"
	"github.com/chaitin/panda-wiki/pkg/bot/feishu"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/cache"
)

type AppUsecase struct {
	repo          *pg.AppRepository
	authRepo      *pg.AuthRepo
	nodeUsecase   *NodeUsecase
	chatUsecase   *ChatUsecase
	logger        *log.Logger
	config        *config.Config
	cache         *cache.Cache
	dingTalkBots  map[string]*dingtalk.DingTalkClient
	dingTalkMutex sync.RWMutex
	feishuBots    map[string]*feishu.FeishuClient
	feishuMutex   sync.RWMutex
	discordBots   map[string]*discord.DiscordClient
	discordMutex  sync.RWMutex
}

func NewAppUsecase(
	repo *pg.AppRepository,
	authRepo *pg.AuthRepo,
	nodeUsecase *NodeUsecase,
	logger *log.Logger,
	config *config.Config,
	chatUsecase *ChatUsecase,
	cache *cache.Cache,
) *AppUsecase {
	u := &AppUsecase{
		repo:         repo,
		nodeUsecase:  nodeUsecase,
		chatUsecase:  chatUsecase,
		authRepo:     authRepo,
		logger:       logger.WithModule("usecase.app"),
		config:       config,
		cache:        cache,
		dingTalkBots: make(map[string]*dingtalk.DingTalkClient),
		feishuBots:   make(map[string]*feishu.FeishuClient),
		discordBots:  make(map[string]*discord.DiscordClient),
	}

	// Initialize all valid DingTalkBot and FeishuBot instances
	apps, err := u.repo.GetAppsByTypes(context.Background(), []domain.AppType{domain.AppTypeDingTalkBot, domain.AppTypeFeishuBot, domain.AppTypeDisCordBot})
	if err != nil {
		u.logger.Error("failed to get dingtalk bot apps", log.Error(err))
		return u
	}

	for _, app := range apps {
		switch app.Type {
		case domain.AppTypeDingTalkBot:
			u.updateDingTalkBot(app)
		case domain.AppTypeFeishuBot:
			u.updateFeishuBot(app)
		case domain.AppTypeDisCordBot:
			u.updateDisCordBot(app)
		}
	}

	return u
}

func (u *AppUsecase) ValidateUpdateApp(ctx context.Context, id string, req *domain.UpdateAppReq, edition consts.LicenseEdition) error {
	switch edition {
	case consts.LicenseEditionEnterprise:
		return nil
	case consts.LicenseEditionFree, consts.LicenseEditionContributor:
		app, err := u.repo.GetAppDetail(ctx, id)
		if err != nil {
			return err
		}

		if app.Settings.WatermarkContent != req.Settings.WatermarkContent ||
			app.Settings.WatermarkSetting != req.Settings.WatermarkSetting ||
			app.Settings.ContributeSettings != req.Settings.ContributeSettings ||
			app.Settings.CopySetting != req.Settings.CopySetting {
			return domain.ErrPermissionDenied
		}
	default:
		return fmt.Errorf("unsupported license type: %d", edition)
	}

	return nil
}

func (u *AppUsecase) UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error {
	if err := u.handleBotAuths(ctx, id, appRequest.Settings); err != nil {
		return err
	}

	if err := u.repo.UpdateApp(ctx, id, appRequest.KbID, appRequest); err != nil {
		return err
	}

	if appRequest.Settings != nil {
		app, err := u.repo.GetAppDetail(ctx, id)
		if err != nil {
			return err
		}
		switch app.Type {
		case domain.AppTypeDingTalkBot:
			u.updateDingTalkBot(app)
		case domain.AppTypeFeishuBot:
			u.updateFeishuBot(app)
		case domain.AppTypeDisCordBot:
			u.updateDisCordBot(app)
		}
	}
	return nil
}

func (u *AppUsecase) getQAFunc(kbID string, appType domain.AppType) bot.GetQAFun {
	return func(ctx context.Context, msg string, info domain.ConversationInfo, ConversationID string) (chan string, error) {
		auth, err := u.authRepo.GetAuthByKBIDAndSourceType(ctx, kbID, appType.ToSourceType())
		if err != nil {
			u.logger.Error("get auth failed", log.Error(err))
			return nil, err
		}
		info.UserInfo.AuthUserID = auth.ID

		eventCh, err := u.chatUsecase.Chat(ctx, &domain.ChatRequest{
			Message:        msg,
			KBID:           kbID,
			AppType:        appType,
			RemoteIP:       "",
			ConversationID: ConversationID,
			Info:           info,
		})
		if err != nil {
			return nil, err
		}
		// check ai feedback. --> default is open
		appinfo, err := u.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWeb)
		if err != nil {
			u.logger.Error("wechat GetAppDetailByKBIDAndAppType failed", log.Error(err))
		}

		var feedback = "\n\n---  \n\n本回答由 PandaWiki 基于 AI 生成，仅供参考。\n[👍 满意](%s) | [👎 不满意](%s)"
		var likeUrl = "%s/feedback?score=1&message_id=%s"
		var dislikeUrl = "%s/feedback?score=-1&message_id=%s"
		var messageId string
		var kb *domain.KnowledgeBase

		if appinfo.Settings.AIFeedbackSettings.AIFeedbackIsEnabled == nil || *appinfo.Settings.AIFeedbackSettings.AIFeedbackIsEnabled { // open
			kb, err = u.chatUsecase.llmUsecase.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
			if err != nil {
				u.logger.Error("wechat GetKnowledgeBaseByID failed", log.Error(err))
			}

		}

		contentCh := make(chan string, 10)
		go func() {
			defer close(contentCh)
			for event := range eventCh {
				if event.Type == "done" || event.Type == "error" {
					break
				}
				if event.Type == "data" {
					contentCh <- event.Content
				}
				if event.Type == "message_id" {
					messageId = event.Content
				}
			}
			// check again
			// contact --> send
			if kb != nil && (appinfo.Settings.AIFeedbackSettings.AIFeedbackIsEnabled == nil || *appinfo.Settings.AIFeedbackSettings.AIFeedbackIsEnabled) { // open
				like := fmt.Sprintf(likeUrl, kb.AccessSettings.BaseURL, messageId)
				dislike := fmt.Sprintf(dislikeUrl, kb.AccessSettings.BaseURL, messageId)
				feedback_data := fmt.Sprintf(feedback, like, dislike)
				contentCh <- feedback_data
			}
		}()
		return contentCh, nil
	}
}

func (u *AppUsecase) updateFeishuBot(app *domain.App) {
	u.feishuMutex.Lock()
	defer u.feishuMutex.Unlock()

	if bot, exists := u.feishuBots[app.ID]; exists {
		if bot != nil {
			bot.Stop()
			delete(u.feishuBots, app.ID)
		}
	}

	if (app.Settings.FeishuBotIsEnabled != nil && !*app.Settings.FeishuBotIsEnabled) || app.Settings.FeishuBotAppID == "" || app.Settings.FeishuBotAppSecret == "" {
		return
	}

	getQA := u.getQAFunc(app.KBID, app.Type)

	botCtx, cancel := context.WithCancel(context.Background())
	feishuClient := feishu.NewFeishuClient(
		botCtx,
		cancel,
		app.Settings.FeishuBotAppID,
		app.Settings.FeishuBotAppSecret,
		u.logger,
		getQA,
	)

	go func() {
		u.logger.Info("feishu bot is starting", log.String("app_id", app.Settings.FeishuBotAppID))
		err := feishuClient.Start()
		if err != nil {
			u.logger.Error("failed to start feishu client", log.Error(err))
			cancel()
			return
		}
	}()

	u.feishuBots[app.ID] = feishuClient
}

func (u *AppUsecase) updateDingTalkBot(app *domain.App) {
	u.dingTalkMutex.Lock()
	defer u.dingTalkMutex.Unlock()

	if bot, exists := u.dingTalkBots[app.ID]; exists {
		if bot != nil {
			bot.Stop()
			delete(u.dingTalkBots, app.ID)
		}
	}

	if (app.Settings.DingTalkBotIsEnabled != nil && !*app.Settings.DingTalkBotIsEnabled) || app.Settings.DingTalkBotClientID == "" || app.Settings.DingTalkBotClientSecret == "" {
		return
	}

	getQA := u.getQAFunc(app.KBID, app.Type)

	botCtx, cancel := context.WithCancel(context.Background())
	dingTalkClient, err := dingtalk.NewDingTalkClient(
		botCtx,
		cancel,
		app.Settings.DingTalkBotClientID,
		app.Settings.DingTalkBotClientSecret,
		app.Settings.DingTalkBotTemplateID,
		u.logger,
		getQA,
	)
	if err != nil {
		u.logger.Error("failed to create dingtalk client", log.Error(err))
		return
	}

	go func() {
		u.logger.Info("dingtalk bot is starting", log.String("client_id", app.Settings.DingTalkBotClientID))
		err := dingTalkClient.Start()
		if err != nil {
			u.logger.Error("failed to start dingtalk bot", log.Error(err))
			cancel()
			return
		}
	}()

	u.dingTalkBots[app.ID] = dingTalkClient
}

func (u *AppUsecase) updateDisCordBot(app *domain.App) {
	u.discordMutex.Lock()
	defer u.discordMutex.Unlock()

	if bot, exists := u.discordBots[app.ID]; exists {
		if bot != nil {
			if err := bot.Stop(); err != nil {
				u.logger.Error("failed to stop discord bot", log.Error(err))
			}
			delete(u.discordBots, app.ID)
		}
	}
	token := app.Settings.DiscordBotToken
	if (app.Settings.DiscordBotIsEnabled != nil && !*app.Settings.DiscordBotIsEnabled) || token == "" {
		return
	}

	getQA := u.getQAFunc(app.KBID, app.Type)

	discordBots, err := discord.NewDiscordClient(
		u.logger, token, getQA,
	)
	if err != nil {
		u.logger.Error("failed to create discord client", log.Error(err))
		return
	}

	if err := discordBots.Start(); err != nil {
		u.logger.Error("failed to start discord bot", log.Error(err))
		return
	}

	u.logger.Info("discord bot is starting", log.String("token", token))
	u.discordBots[app.ID] = discordBots
}

func (u *AppUsecase) DeleteApp(ctx context.Context, id, kbID string) error {
	return u.repo.DeleteApp(ctx, id, kbID)
}

func (u *AppUsecase) GetAppDetailByKBIDAndAppType(ctx context.Context, kbID string, appType domain.AppType) (*domain.AppDetailResp, error) {
	app, err := u.repo.GetOrCreateAppByKBIDAndType(ctx, kbID, appType)
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
		// DingTalkBot
		DingTalkBotIsEnabled:    app.Settings.DingTalkBotIsEnabled,
		DingTalkBotClientID:     app.Settings.DingTalkBotClientID,
		DingTalkBotClientSecret: app.Settings.DingTalkBotClientSecret,
		DingTalkBotTemplateID:   app.Settings.DingTalkBotTemplateID,
		// FeishuBot
		FeishuBotIsEnabled: app.Settings.FeishuBotIsEnabled,
		FeishuBotAppID:     app.Settings.FeishuBotAppID,
		FeishuBotAppSecret: app.Settings.FeishuBotAppSecret,
		// WechatBot
		WeChatAppIsEnabled:      app.Settings.WeChatAppIsEnabled,
		WeChatAppToken:          app.Settings.WeChatAppToken,
		WeChatAppCorpID:         app.Settings.WeChatAppCorpID,
		WeChatAppEncodingAESKey: app.Settings.WeChatAppEncodingAESKey,
		WeChatAppSecret:         app.Settings.WeChatAppSecret,
		WeChatAppAgentID:        app.Settings.WeChatAppAgentID,
		// WechatServiceBot
		WeChatServiceIsEnabled:      app.Settings.WeChatServiceIsEnabled,
		WeChatServiceToken:          app.Settings.WeChatServiceToken,
		WeChatServiceEncodingAESKey: app.Settings.WeChatServiceEncodingAESKey,
		WeChatServiceCorpID:         app.Settings.WeChatServiceCorpID,
		WeChatServiceSecret:         app.Settings.WeChatServiceSecret,
		// Discord
		DiscordBotIsEnabled: app.Settings.DiscordBotIsEnabled,
		DiscordBotToken:     app.Settings.DiscordBotToken,
		// WechatOfficialAccount
		WechatOfficialAccountIsEnabled:      app.Settings.WechatOfficialAccountIsEnabled,
		WechatOfficialAccountAppID:          app.Settings.WechatOfficialAccountAppID,
		WechatOfficialAccountAppSecret:      app.Settings.WechatOfficialAccountAppSecret,
		WechatOfficialAccountToken:          app.Settings.WechatOfficialAccountToken,
		WechatOfficialAccountEncodingAESKey: app.Settings.WechatOfficialAccountEncodingAESKey,
		// theme
		ThemeMode:     app.Settings.ThemeMode,
		ThemeAndStyle: app.Settings.ThemeAndStyle,
		// catalog settings
		CatalogSettings: app.Settings.CatalogSettings,
		// footer settings
		FooterSettings: app.Settings.FooterSettings,
		// widget bot settings
		WidgetBotSettings: app.Settings.WidgetBotSettings,
		// webapp comment settings
		WebAppCommentSettings: app.Settings.WebAppCommentSettings,
		// document feedback
		DocumentFeedBackIsEnabled: app.Settings.DocumentFeedBackIsEnabled,
		// AI Feedback
		AIFeedbackSettings: app.Settings.AIFeedbackSettings,
		// WebApp Custom Settings
		WebAppCustomSettings: app.Settings.WebAppCustomSettings,
		// openai api settings
		OpenAIAPIBotSettings: app.Settings.OpenAIAPIBotSettings,
		// disclaimer settings
		DisclaimerSettings: app.Settings.DisclaimerSettings,
		// webapp landing settings
		WebAppLandingSettings: app.Settings.WebAppLandingSettings,

		WatermarkContent:   app.Settings.WatermarkContent,
		WatermarkSetting:   app.Settings.WatermarkSetting,
		CopySetting:        app.Settings.CopySetting,
		ContributeSettings: app.Settings.ContributeSettings,
	}
	// init ai feedback string
	if app.Settings.AIFeedbackSettings.AIFeedbackType == nil {
		appDetailResp.Settings.AIFeedbackSettings.AIFeedbackType = []string{"内容不准确", "没有帮助", "其他"}
	}

	// get recommend nodes
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
	app, err := u.repo.GetOrCreateAppByKBIDAndType(ctx, kbID, domain.AppTypeWeb)
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
			// theme
			ThemeMode:     app.Settings.ThemeMode,
			ThemeAndStyle: app.Settings.ThemeAndStyle,
			// catalog settings
			CatalogSettings: app.Settings.CatalogSettings,
			// footer settings
			FooterSettings: app.Settings.FooterSettings,
			// widget bot settings
			WebAppCommentSettings: app.Settings.WebAppCommentSettings,
			// document feedback
			DocumentFeedBackIsEnabled: app.Settings.DocumentFeedBackIsEnabled,
			// AI Feedback
			AIFeedbackSettings: app.Settings.AIFeedbackSettings,
			// WebApp Custom Settings
			WebAppCustomSettings: app.Settings.WebAppCustomSettings,
			// Disclaimer Settings
			DisclaimerSettings: app.Settings.DisclaimerSettings,
			// WebApp Landing Settings
			WebAppLandingSettings: app.Settings.WebAppLandingSettings,

			WatermarkContent:   app.Settings.WatermarkContent,
			WatermarkSetting:   app.Settings.WatermarkSetting,
			CopySetting:        app.Settings.CopySetting,
			ContributeSettings: app.Settings.ContributeSettings,
		},
	}
	// init ai feedback string
	if app.Settings.AIFeedbackSettings.AIFeedbackType == nil {
		appInfo.Settings.AIFeedbackSettings.AIFeedbackType = []string{"内容不准确", "没有帮助", "其他"}
	}
	showBrand := true
	defaultDisclaimer := "本回答由 PandaWiki 基于 AI 生成，仅供参考。"
	licenseEdition, _ := ctx.Value(consts.ContextKeyEdition).(consts.LicenseEdition)
	if licenseEdition < consts.LicenseEditionEnterprise {
		appInfo.Settings.WebAppCustomSettings.ShowBrandInfo = &showBrand
		appInfo.Settings.DisclaimerSettings.Content = &defaultDisclaimer
	} else {
		if appInfo.Settings.DisclaimerSettings.Content == nil {
			appInfo.Settings.DisclaimerSettings.Content = &defaultDisclaimer
		}
	}

	return appInfo, nil
}

func (u *AppUsecase) GetWidgetAppInfo(ctx context.Context, kbID string) (*domain.AppInfoResp, error) {
	webApp, err := u.repo.GetOrCreateAppByKBIDAndType(ctx, kbID, domain.AppTypeWeb)
	if err != nil {
		return nil, err
	}
	widgetApp, err := u.repo.GetOrCreateAppByKBIDAndType(ctx, kbID, domain.AppTypeWidget)
	if err != nil {
		return nil, err
	}
	appInfo := &domain.AppInfoResp{
		Settings: domain.AppSettingsResp{
			Title:              webApp.Settings.Title,
			Icon:               webApp.Settings.Icon,
			WelcomeStr:         webApp.Settings.WelcomeStr,
			SearchPlaceholder:  webApp.Settings.SearchPlaceholder,
			RecommendQuestions: webApp.Settings.RecommendQuestions,
			WidgetBotSettings:  widgetApp.Settings.WidgetBotSettings,
		},
	}
	if len(webApp.Settings.RecommendNodeIDs) > 0 {
		nodes, err := u.nodeUsecase.GetRecommendNodeList(ctx, &domain.GetRecommendNodeListReq{
			KBID:    kbID,
			NodeIDs: webApp.Settings.RecommendNodeIDs,
		})
		if err != nil {
			return nil, err
		}
		appInfo.RecommendNodes = nodes
	}
	return appInfo, nil
}

func (u *AppUsecase) handleBotAuths(ctx context.Context, id string, newSettings *domain.AppSettings) error {

	currentApp, err := u.repo.GetAppDetail(ctx, id)
	if err != nil {
		return err
	}

	switch currentApp.Type {

	}
	// Handle Widget Bot
	if currentApp.Settings.WidgetBotSettings.IsOpen != newSettings.WidgetBotSettings.IsOpen {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, &currentApp.Settings.WidgetBotSettings.IsOpen,
			&newSettings.WidgetBotSettings.IsOpen, consts.SourceTypeWidget); err != nil {
			u.logger.Error("failed to handle widget auth", log.Error(err))
		}
	}

	// Handle DingTalk Bot
	if currentApp.Settings.DingTalkBotIsEnabled != newSettings.DingTalkBotIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.DingTalkBotIsEnabled,
			newSettings.DingTalkBotIsEnabled, consts.SourceTypeDingtalkBot); err != nil {
			u.logger.Error("failed to handle dingtalk bot auth", log.Error(err))
		}
	}

	// Handle Feishu Bot
	if currentApp.Settings.FeishuBotIsEnabled != newSettings.FeishuBotIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.FeishuBotIsEnabled,
			newSettings.FeishuBotIsEnabled, consts.SourceTypeFeishuBot); err != nil {
			u.logger.Error("failed to handle feishu bot auth", log.Error(err))
		}
	}

	// Handle WeChat Bot
	if currentApp.Settings.WeChatAppIsEnabled != newSettings.WeChatAppIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.WeChatAppIsEnabled,
			newSettings.WeChatAppIsEnabled, consts.SourceTypeWechatBot); err != nil {
			u.logger.Error("failed to handle wechat bot auth", log.Error(err))
		}
	}

	// Handle WeChat Service Bot
	if currentApp.Settings.WeChatServiceIsEnabled != newSettings.WeChatServiceIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.WeChatServiceIsEnabled,
			newSettings.WeChatServiceIsEnabled, consts.SourceTypeWechatServiceBot); err != nil {
			u.logger.Error("failed to handle wechat service bot auth", log.Error(err))
		}
	}

	// Handle Discord Bot
	if currentApp.Settings.DiscordBotIsEnabled != newSettings.DiscordBotIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.DiscordBotIsEnabled,
			newSettings.DiscordBotIsEnabled, consts.SourceTypeDiscordBot); err != nil {
			u.logger.Error("failed to handle discord bot auth", log.Error(err))
		}
	}

	// Handle WeChat Official Account
	if currentApp.Settings.WechatOfficialAccountIsEnabled != newSettings.WechatOfficialAccountIsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, currentApp.Settings.WechatOfficialAccountIsEnabled,
			newSettings.WechatOfficialAccountIsEnabled, consts.SourceTypeWechatOfficialAccount); err != nil {
			u.logger.Error("failed to handle wechat official account auth", log.Error(err))
		}
	}

	// Handle OpenAI API BOT Account
	if currentApp.Settings.OpenAIAPIBotSettings.IsEnabled != newSettings.OpenAIAPIBotSettings.IsEnabled {
		if err := u.handleBotAuth(ctx, currentApp.KBID, currentApp.ID, &currentApp.Settings.OpenAIAPIBotSettings.IsEnabled,
			&newSettings.OpenAIAPIBotSettings.IsEnabled, consts.SourceTypeOpenAIAPI); err != nil {
			u.logger.Error("failed to handle openai api bot auth", log.Error(err))
		}
	}

	return nil
}

func (u *AppUsecase) handleBotAuth(ctx context.Context, kbID, appId string, currentEnabled, newEnabled *bool, sourceType consts.SourceType) error {
	wasEnabled := currentEnabled != nil && *currentEnabled
	isEnabled := newEnabled != nil && *newEnabled

	if !wasEnabled && isEnabled {
		rdsKey := fmt.Sprintf("handleBotAuth:%s:%s", kbID, sourceType)
		if !u.cache.AcquireLock(ctx, rdsKey) {
			return fmt.Errorf("bot auth creation is in progress, please try again later")
		}
		defer u.cache.ReleaseLock(ctx, rdsKey)

		existingAuth, _ := u.authRepo.GetAuthByKBIDAndSourceType(ctx, kbID, sourceType)
		if existingAuth != nil {
			return nil
		}

		auth := &domain.Auth{
			KBID:          kbID,
			UnionID:       fmt.Sprintf("bot_%s_%s", appId, sourceType),
			SourceType:    sourceType,
			LastLoginTime: time.Now(),
			UserInfo: domain.AuthUserInfo{
				Username: sourceType.Name(),
			},
		}

		if err := u.authRepo.CreateAuth(ctx, auth); err != nil {
			return fmt.Errorf("failed to create auth for %s: %w", sourceType, err)
		}

	}

	return nil
}

func (u *AppUsecase) GetOpenAIAPIAppInfo(ctx context.Context, kbID string) (*domain.AppInfoResp, error) {
	apiApp, err := u.repo.GetOrCreateAppByKBIDAndType(ctx, kbID, domain.AppTypeOpenAIAPI)
	if err != nil {
		return nil, err
	}
	appInfo := &domain.AppInfoResp{
		Settings: domain.AppSettingsResp{
			OpenAIAPIBotSettings: apiApp.Settings.OpenAIAPIBotSettings,
		},
	}
	return appInfo, nil
}
