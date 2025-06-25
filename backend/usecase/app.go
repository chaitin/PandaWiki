package usecase

import (
	"context"
	"encoding/xml"
	"fmt"
	"sync"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/dingtalk"
	"github.com/chaitin/panda-wiki/pkg/bot/feishu"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
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
	}

	// Initialize all valid DingTalkBot instances
	apps, err := u.repo.GetAppsByTypes(context.Background(), []domain.AppType{domain.AppTypeDingTalkBot, domain.AppTypeFeishuBot})
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
		}
	}

	return u
}

func (u *AppUsecase) UpdateApp(ctx context.Context, id string, appRequest *domain.UpdateAppReq) error {
	if err := u.repo.UpdateApp(ctx, id, appRequest); err != nil {
		return err
	}

	// If this is a DingTalkBot app, check if we need to update the bot instance
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
		}
	}
	return nil
}

func (u *AppUsecase) getQAFunc(kbID string, appType domain.AppType) func(ctx context.Context, msg string) (chan string, error) {
	return func(ctx context.Context, msg string) (chan string, error) {
		eventCh, err := u.chatUsecase.Chat(ctx, &domain.ChatRequest{
			Message:  msg,
			KBID:     kbID,
			AppType:  appType,
			RemoteIP: "",
		})
		if err != nil {
			return nil, err
		}
		contentCh := make(chan string, 10)
		go func() {
			defer close(contentCh)
			for event := range eventCh { // 从chat之后的结果拿到对应的东西放到对应的string channel中
				if event.Type == "done" || event.Type == "error" {
					break
				}
				if event.Type == "data" {
					contentCh <- event.Content
				}
			}
		}()
		return contentCh, nil
	}
}

func (u *AppUsecase) wechatQAFunc(kbID string, appType domain.AppType, remoteip string) func(ctx context.Context, msg string) (chan string, error) {
	return func(ctx context.Context, msg string) (chan string, error) {
		eventCh, err := u.chatUsecase.Chat(ctx, &domain.ChatRequest{
			Message:  msg,
			KBID:     kbID,
			AppType:  appType,
			RemoteIP: remoteip,
		})
		if err != nil {
			return nil, err
		}
		contentCh := make(chan string, 10)
		go func() {
			defer close(contentCh)
			for event := range eventCh { // 从chat之后的结果拿到对应的东西放到对应的string channel中
				if event.Type == "done" || event.Type == "error" {
					break
				}
				if event.Type == "data" {
					contentCh <- event.Content
				}
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

	if app.Settings.FeishuBotAppID == "" || app.Settings.FeishuBotAppSecret == "" {
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

	if app.Settings.DingTalkBotClientID == "" || app.Settings.DingTalkBotClientSecret == "" {
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

func (u *AppUsecase) DeleteApp(ctx context.Context, id string) error {
	return u.repo.DeleteApp(ctx, id)
}

func (u *AppUsecase) GetAppDetailByKBIDAndAppType(ctx context.Context, kbID string, appType domain.AppType) (*domain.AppDetailResp, error) {
	app, err := u.repo.GetOrCreateApplByKBIDAndType(ctx, kbID, appType)
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
		DingTalkBotClientID:     app.Settings.DingTalkBotClientID,
		DingTalkBotClientSecret: app.Settings.DingTalkBotClientSecret,
		DingTalkBotTemplateID:   app.Settings.DingTalkBotTemplateID,
		// FeishuBot
		FeishuBotAppID:     app.Settings.FeishuBotAppID,
		FeishuBotAppSecret: app.Settings.FeishuBotAppSecret,

		// WechatBot
		WeChatToken:      app.Settings.WeChatToken,
		WeCorpID:         app.Settings.WeCorpID,
		WeEncodingAESKey: app.Settings.WeEncodingAESKey,
		WeSecret:         app.Settings.WeSecret,
		WeAgantID:        app.Settings.WeAgantID,

		// theme
		ThemeMode: app.Settings.ThemeMode,
		// catalog settings
		CatalogSettings: app.Settings.CatalogSettings,
		// footer settings
		FooterSettings: app.Settings.FooterSettings,
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
	app, err := u.repo.GetOrCreateApplByKBIDAndType(ctx, kbID, domain.AppTypeWeb)
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
			ThemeMode: app.Settings.ThemeMode,
			// catalog settings
			CatalogSettings: app.Settings.CatalogSettings,
			// footer settings
			FooterSettings: app.Settings.FooterSettings,
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

// 验证企业微信的回调 -- 先查询数据库得到用户传入的token来解密
func (u *AppUsecase) VerifiyUrl(ctx context.Context, signature, timestamp, nonce, echostr, KbId string) ([]byte, error) {

	// 找到对应的企业微信配置
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)
	if err != nil {
		u.logger.Error("find Appdetail failed")
	}
	u.logger.Info("拿到了map中的第一个企业微信机器人的消息", appres)

	// 先查询对应的企业微信的配置--拿到wechatbot的配置
	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeCorpID,
		appres.Settings.WeChatToken,
		appres.Settings.WeEncodingAESKey,
		KbId,
		appres.Settings.WeSecret,
		appres.Settings.WeAgantID,
	)

	if err != nil {
		u.logger.Error("failed to create WechatConfig", log.Error(err))
		return nil, err
	}

	body, err := wc.VerifiyUrl(signature, timestamp, nonce, echostr)
	if err != nil {
		u.logger.Error("wc verifiyUrl failed", log.Error(err))
		return nil, err
	}
	return body, nil
}

// 接受企业微信发送的消息
func (u *AppUsecase) Wechat(ctx context.Context, signature, timestamp, nonce string, body []byte, KbId string, remoteip string) error {

	// 找到对应的企业微信配置--类型为apptype
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)

	if err != nil {
		u.logger.Error("find Appdetail failed")
	}

	// 查询获取到配置
	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeCorpID,
		appres.Settings.WeChatToken,
		appres.Settings.WeEncodingAESKey,
		KbId,
		appres.Settings.WeSecret,
		appres.Settings.WeAgantID,
	)

	if err != nil {
		u.logger.Error("failed to create WechatConfig", log.Error(err))
		return err
	}
	u.logger.Info("remote ip :", remoteip)

	// 大模型的chat方法--拿到的就是chan string的大模型回答的结果
	getQA := u.wechatQAFunc(KbId, appres.Type, remoteip)

	err = wc.Wechat(signature, timestamp, nonce, body, getQA)

	if err != nil {
		u.logger.Error("wc wechat failed", log.Error(err))
		return err
	}
	return nil
}

func (u *AppUsecase) SendImmediateResponse(ctx context.Context, signature, timestamp, nonce string, body []byte, kbID string) ([]byte, error) {
	// 查询配置
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatBot)
	if err != nil {
		return nil, err
	}

	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeCorpID,
		appres.Settings.WeChatToken,
		appres.Settings.WeEncodingAESKey,
		kbID,
		appres.Settings.WeSecret,
		appres.Settings.WeAgantID,
	)

	u.logger.Info("sendimi wechat-bot:", appres)

	if err != nil {
		return nil, err
	}

	// 解析消息以获取FromUserName,一定要解析数据，拿到可以恢复的东西，才能恢复
	wxcpt := wxbizmsgcrypt.NewWXBizMsgCrypt(wc.Token, wc.EncodingAESKey, wc.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxcpt.DecryptMsg(signature, timestamp, nonce, body)
	if errCode != nil {
		return nil, fmt.Errorf("解密消息失败，错误码: %v", errCode)
	}

	var msg wechat.ReceivedMessage
	if err := xml.Unmarshal(decryptMsg, &msg); err != nil {
		return nil, err
	}

	// 发送"正在思考"响应
	return wc.SendResponse(msg, "正在思考您的问题，请稍候...")
}
