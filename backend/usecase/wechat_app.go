package usecase

import (
	"context"
	"errors"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat"
)

func (u *AppUsecase) VerifyUrlWechatAPP(ctx context.Context, signature, timestamp, nonce, echoStr, KbId string) ([]byte, error) {
	// get wechat app bot info
	appInfo, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)
	if err != nil {
		u.logger.Error("get app detail failed")
		return nil, err
	}
	if appInfo.Settings.WeChatAppIsEnabled != nil && !*appInfo.Settings.WeChatAppIsEnabled {
		return nil, errors.New("wechat app is disabled")
	}

	u.logger.Debug("wechat app info", log.Any("info", appInfo))

	wechatConfig, err := wechat.NewWechatConfig(
		ctx,
		appInfo.Settings.WeChatAppCorpID,
		appInfo.Settings.WeChatAppToken,
		appInfo.Settings.WeChatAppEncodingAESKey,
		KbId,
		appInfo.Settings.WeChatAppSecret,
		appInfo.Settings.WeChatAppAgentID,
		u.logger,
	)

	if err != nil {
		u.logger.Error("failed to create WechatConfig", log.Error(err))
		return nil, err
	}

	body, err := wechatConfig.VerifyUrlWechatAPP(signature, timestamp, nonce, echoStr)
	if err != nil {
		u.logger.Error("wechat config verify url failed", log.Error(err))
		return nil, err
	}
	return body, nil
}

func (u *AppUsecase) Wechat(ctx context.Context, msg *wechat.ReceivedMessage, wc *wechat.WechatConfig, KbId string, remoteIP string) error {
	// 调用接口，获取到用户的详细消息
	userinfo, err := wc.GetUserInfo(msg.FromUserName)
	if err != nil {
		u.logger.Error("GetUserInfo failed", log.Error(err))
		return err
	}
	u.logger.Info("get userinfo success", log.Any("userinfo", userinfo))

	// use ai--> 并且传递用户消息
	getQA := u.wechatQAFunc(KbId, domain.AppTypeWechatBot, remoteIP, userinfo)

	// 发送消息给用户
	err = wc.Wechat(*msg, getQA)

	if err != nil {
		u.logger.Error("wc wechat failed", log.Error(err))
		return err
	}
	return nil
}

func (u *AppUsecase) NewWechatConfig(ctx context.Context, appInfo *domain.AppDetailResp, kbID string) (*wechat.WechatConfig, error) {
	return wechat.NewWechatConfig(
		ctx,
		appInfo.Settings.WeChatAppCorpID,
		appInfo.Settings.WeChatAppToken,
		appInfo.Settings.WeChatAppEncodingAESKey,
		kbID,
		appInfo.Settings.WeChatAppSecret,
		appInfo.Settings.WeChatAppAgentID,
		u.logger,
	)
}
