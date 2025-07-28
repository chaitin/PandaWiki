package usecase

import (
	"context"
	"errors"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wechatservice"
)

func (u *AppUsecase) VerifyUrlWechatService(ctx context.Context, signature, timestamp, nonce, echoStr, kbID string) ([]byte, error) {
	// 只有5秒
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	appInfo, err := u.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatServiceBot)
	if err != nil {
		u.logger.Error("find app detail failed", log.Error(err))
		return nil, err
	}
	if appInfo.Settings.WeChatServiceIsEnabled != nil && !*appInfo.Settings.WeChatServiceIsEnabled {
		return nil, errors.New("wechat service bot is not enabled")
	}

	u.logger.Debug("wechat Service info", log.Any("info", appInfo))

	WechatServiceConf, err := u.NewWechatServiceConfig(ctx, appInfo, kbID)

	if err != nil {
		u.logger.Error("failed to create WechatServiceConfig", log.Error(err))
		return nil, err
	}

	body, err := WechatServiceConf.VerifyUrlWechatService(signature, timestamp, nonce, echoStr)
	if err != nil {
		u.logger.Error("WechatServiceConf verify url failed", log.Error(err))
		return nil, err
	}
	return body, nil
}

func (u *AppUsecase) WechatService(ctx context.Context, msg *wechatservice.WeixinUserAskMsg, kbID string, WechatServiceConfig *wechatservice.WechatServiceConfig) error {
	getQA := u.getQAFunc(kbID, domain.AppTypeWechatServiceBot)

	err := WechatServiceConfig.Wechat(msg, getQA)

	if err != nil {
		u.logger.Error("WechatServiceConf wechat failed", log.Error(err))
		return err
	}
	return nil
}

func (u *AppUsecase) NewWechatServiceConfig(ctx context.Context, appInfo *domain.AppDetailResp, kbID string) (*wechatservice.WechatServiceConfig, error) {
	return wechatservice.NewWechatServiceConfig(
		ctx,
		appInfo.Settings.WeChatServiceCorpID,
		appInfo.Settings.WeChatServiceToken,
		appInfo.Settings.WeChatServiceEncodingAESKey,
		kbID,
		appInfo.Settings.WeChatServiceSecret,
		u.logger,
	)
}
