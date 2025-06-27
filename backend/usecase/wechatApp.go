package usecase

import (
	"context"
	"encoding/xml"
	"fmt"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
)

func (u *AppUsecase) VerifiyUrl(ctx context.Context, signature, timestamp, nonce, echostr, KbId string) ([]byte, error) {

	// find wechat-bot
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)
	if err != nil {
		u.logger.Error("find Appdetail failed")
	}

<<<<<<< HEAD
	u.logger.Debug("wechat app info", log.Any("info", appres))
=======
	u.logger.Info("拿到了map中的第一个企业微信机器人的消息", appres)
>>>>>>> a8e0c07 (change name for wechatapp)

	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeChatAppCorpID,
		appres.Settings.WeChatAppToken,
		appres.Settings.WeChatAppEncodingAESKey,
		KbId,
		appres.Settings.WeChatAppSecret,
<<<<<<< HEAD
		appres.Settings.WeChatAppAgentID,
=======
		appres.Settings.WeChatAppAgantID,
>>>>>>> a8e0c07 (change name for wechatapp)
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

func (u *AppUsecase) Wechat(ctx context.Context, signature, timestamp, nonce string, body []byte, KbId string, remoteip string) error {

	// find wechat-bot
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, KbId, domain.AppTypeWechatBot)

	if err != nil {
		u.logger.Error("find Appdetail failed")
	}

	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeChatAppCorpID,
		appres.Settings.WeChatAppToken,
		appres.Settings.WeChatAppEncodingAESKey,
		KbId,
		appres.Settings.WeChatAppSecret,
<<<<<<< HEAD
		appres.Settings.WeChatAppAgentID,
=======
		appres.Settings.WeChatAppAgantID,
>>>>>>> a8e0c07 (change name for wechatapp)
	)

	if err != nil {
		u.logger.Error("failed to create WechatConfig", log.Error(err))
		return err
	}
<<<<<<< HEAD
	u.logger.Info("remote ip", log.String("ip", remoteip))
=======
	u.logger.Info("remote ip :", remoteip)
>>>>>>> a8e0c07 (change name for wechatapp)

	// use ai
	getQA := u.wechatQAFunc(KbId, appres.Type, remoteip)

	err = wc.Wechat(signature, timestamp, nonce, body, getQA)

	if err != nil {
		u.logger.Error("wc wechat failed", log.Error(err))
		return err
	}
	return nil
}

func (u *AppUsecase) SendImmediateResponse(ctx context.Context, signature, timestamp, nonce string, body []byte, kbID string) ([]byte, error) {
	appres, err := u.GetAppDetailByKBIDAndAppType(ctx, kbID, domain.AppTypeWechatBot)

	if err != nil {
		return nil, err
	}

	wc, err := wechat.NewWechatConfig(
		ctx,
		appres.Settings.WeChatAppCorpID,
		appres.Settings.WeChatAppToken,
		appres.Settings.WeChatAppEncodingAESKey,
		kbID,
		appres.Settings.WeChatAppSecret,
<<<<<<< HEAD
		appres.Settings.WeChatAppAgentID,
	)

	u.logger.Debug("wechat app info", log.Any("app", appres))
=======
		appres.Settings.WeChatAppAgantID,
	)

	u.logger.Info("sendimi wechat-bot:", appres)
>>>>>>> a8e0c07 (change name for wechatapp)

	if err != nil {
		return nil, err
	}

	wxcpt := wxbizmsgcrypt.NewWXBizMsgCrypt(wc.Token, wc.EncodingAESKey, wc.CorpID, wxbizmsgcrypt.XmlType)
	decryptMsg, errCode := wxcpt.DecryptMsg(signature, timestamp, nonce, body)

	if errCode != nil {
<<<<<<< HEAD
		return nil, fmt.Errorf("DecrypMsg failed: %v", errCode)
=======
		return nil, fmt.Errorf("Decryp Msg failed: %v", errCode)
>>>>>>> a8e0c07 (change name for wechatapp)
	}

	var msg wechat.ReceivedMessage
	if err := xml.Unmarshal(decryptMsg, &msg); err != nil {
		return nil, err
	}

	// send response "正在思考"
	return wc.SendResponse(msg, "正在思考您的问题，请稍候...")
}
