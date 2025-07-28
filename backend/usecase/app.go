package usecase

import (
	"context"
	"fmt"
	"sync"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
	"github.com/chaitin/panda-wiki/pkg/bot/dingtalk"
	"github.com/chaitin/panda-wiki/pkg/bot/discord"
	"github.com/chaitin/panda-wiki/pkg/bot/feishu"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type AppUsecase struct {
	repo          *pg.AppRepository
	nodeUsecase   *NodeUsecase
	chatUsecase   *ChatUsecase
	logger        *log.Logger
	config        *config.Config
	dingTalkBots  map[string]*dingtalk.DingTalkClient
	dingTalkMutex sync.RWMutex
	feishuBots    map[string]*feishu.FeishuClient
	feishuMutex   sync.RWMutex
	discordBots   map[string]*discord.DiscordClient
	discordMutex  sync.RWMutex
}

func NewAppUsecase(
	repo *pg.AppRepository,
	nodeUsecase *NodeUsecase,
	logger *log.Logger,
	config *config.Config,
	chatUsecase *ChatUsecase,
) *AppUsecase {
	u := &AppUsecase{
		repo:         repo,
		nodeUsecase:  nodeUsecase,
		chatUsecase:  chatUsecase,
		logger:       logger.WithModule("usecase.app"),
		config:       config,
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

func (u *AppUsecase) UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error {
	if err := u.repo.UpdateApp(ctx, id, appRequest); err != nil {
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
		kb, err := u.chatUsecase.llmUsecase.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
		if err != nil {
			u.logger.Error("wechat GetKnowledgeBaseByID failed", log.Error(err))
		}
		contentCh := make(chan string, 10)
		var feedback = "\n\n---  \n\n本答案由 PandaWiki 生成  \n[👍 满意](%s) | [👎 不满意](%s)"
		var likeUrl = "%s/feedback?score=1&message_id=%s"
		var dislikeUrl = "%s/feedback?score=-1&message_id=%s"
		var messageId string
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

			// contact
			like := fmt.Sprintf(likeUrl, kb.AccessSettings.BaseURL, messageId)
			dislike := fmt.Sprintf(dislikeUrl, kb.AccessSettings.BaseURL, messageId)
			feedback_data := fmt.Sprintf(feedback, like, dislike)
			contentCh <- feedback_data
		}()
		return contentCh, nil
	}
}

func (u *AppUsecase) wechatQAFunc(kbID string, appType domain.AppType, remoteip string, userinfo *wechat.UserInfo) func(ctx context.Context, msg string) (chan string, error) {
	return func(ctx context.Context, msg string) (chan string, error) {
		eventCh, err := u.chatUsecase.Chat(ctx, &domain.ChatRequest{
			Message:  msg,
			KBID:     kbID,
			AppType:  appType,
			RemoteIP: remoteip,
			Info: domain.ConversationInfo{
				UserInfo: domain.UserInfo{
					UserID:   userinfo.UserID,
					NickName: userinfo.Name,
					From:     domain.MessageFromPrivate,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		kb, err := u.chatUsecase.llmUsecase.kbRepo.GetKnowledgeBaseByID(ctx, kbID)
		if err != nil {
			u.logger.Error("wechat GetKnowledgeBaseByID failed", log.Error(err))
		}
		contentCh := make(chan string, 10)
		var feedback = "\n\n---  \n\n此回答结果对您有帮助吗?  \n[👍 满意](%s) | [👎 不满意](%s)"
		var likeUrl = "%s/feedback?score=1&message_id=%s"
		var dislikeUrl = "%s/feedback?score=-1&message_id=%s"
		var messageId string
		go func() {
			defer close(contentCh)
			for event := range eventCh { // get content from eventch
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

			// contact
			like := fmt.Sprintf(likeUrl, kb.AccessSettings.BaseURL, messageId)
			dislike := fmt.Sprintf(dislikeUrl, kb.AccessSettings.BaseURL, messageId)
			feedback_data := fmt.Sprintf(feedback, like, dislike)
			contentCh <- feedback_data
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

func (u *AppUsecase) DeleteApp(ctx context.Context, id string) error {
	return u.repo.DeleteApp(ctx, id)
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
