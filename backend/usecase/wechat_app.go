package usecase

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"

	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"

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
		"",
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

func (u *AppUsecase) Wechat(ctx context.Context, signature, timestamp, nonce string, body []byte, KbId string, remoteIP string) error {
	appInfo, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)
	if err != nil {
		u.logger.Error("find app detail failed")
		return err
	}
	if appInfo.Settings.WeChatAppIsEnabled == nil && !*appInfo.Settings.WeChatAppIsEnabled {
		return errors.New("wechat app bot is not enabled")

	}
	// 查询数据库，拿到kb
	kb, err := u.chatUsecase.llmUsecase.kbRepo.GetKnowledgeBaseByID(ctx, KbId)
	if err != nil {
		u.logger.Error("wechat GetKnowledgeBaseByID failed", log.Error(err))
	}

	wc, err := wechat.NewWechatConfig(
		ctx,
		appInfo.Settings.WeChatAppCorpID,
		appInfo.Settings.WeChatAppToken,
		appInfo.Settings.WeChatAppEncodingAESKey,
		KbId,
		appInfo.Settings.WeChatAppSecret,
		appInfo.Settings.WeChatAppAgentID,
		u.logger,
		kb.AccessSettings.BaseURL,
	)

	if err != nil {
		u.logger.Error("failed to create WechatConfig", log.Error(err))
		return err
	}
	u.logger.Info("remote ip", log.String("ip", remoteIP))

	// 先解密消息
	wxCrypt := wxbizmsgcrypt.NewWXBizMsgCrypt(wc.Token, wc.EncodingAESKey, wc.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxCrypt.DecryptMsg(signature, timestamp, nonce, body)
	if errCode != nil {
		u.logger.Error("DecryptMsg failed", log.Error(err))
		return fmt.Errorf("DecryptMsg failed: %v", errCode)
	}
	// u.logger.Info("decryptMsg", log.Any("msg:", decryptMsg))

	var msg wechat.ReceivedMessage
	err = xml.Unmarshal([]byte(decryptMsg), &msg)
	if err != nil {
		return err
	}
	u.logger.Debug("received message", log.Any("message", msg)) // debug level

	// 调用接口，获取到用户的详细消息
	userinfo, err := wc.GetUserInfo(msg.FromUserName)
	if err != nil {
		u.logger.Error("GetUserInfo failed", log.Error(err))
		return err
	}
	u.logger.Info("get userinfo success", log.Any("userinfo", userinfo))

	// use ai--> 并且传递用户消息
	getQA := u.wechatQAFunc(KbId, appInfo.Type, remoteIP, userinfo)

	// 发送消息给用户
	err = wc.Wechat(msg, getQA)

	if err != nil {
		u.logger.Error("wc wechat failed", log.Error(err))
		return err
	}
	return nil
}

func (u *AppUsecase) SendImmediateResponse(ctx context.Context, signature, timestamp, nonce string, body []byte, kbID string) ([]byte, error) {
	appInfo, err := u.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatBot)
	if err != nil {
		return nil, err
	}
	if appInfo.Settings.WeChatAppIsEnabled != nil && !*appInfo.Settings.WeChatAppIsEnabled {
		return nil, errors.New("wechat app bot is not enabled")
	}

	wc, err := wechat.NewWechatConfig(
		ctx,
		appInfo.Settings.WeChatAppCorpID,
		appInfo.Settings.WeChatAppToken,
		appInfo.Settings.WeChatAppEncodingAESKey,
		kbID,
		appInfo.Settings.WeChatAppSecret,
		appInfo.Settings.WeChatAppAgentID,
		u.logger,
		"",
	)

	u.logger.Debug("wechat app info", log.Any("app", appInfo))

	if err != nil {
		return nil, err
	}

	wxCrypt := wxbizmsgcrypt.NewWXBizMsgCrypt(wc.Token, wc.EncodingAESKey, wc.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxCrypt.DecryptMsg(signature, timestamp, nonce, body)

	if errCode != nil {
		return nil, fmt.Errorf("decrypt msg failed: %v", errCode)
	}

	var msg wechat.ReceivedMessage
	if err := xml.Unmarshal(decryptMsg, &msg); err != nil {
		return nil, err
	}

	// send response "正在思考"
	return wc.SendResponse(msg, "正在思考您的问题，请稍候...")
}
