package usecase

import (
	"context"
	"fmt"

	"github.com/silenceper/wechat/v2/officialaccount"
	offMessage "github.com/silenceper/wechat/v2/officialaccount/message"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot/wechat_official_account"
)

func (u *AppUsecase) GetWechatOfficialAccountResponse(ctx context.Context, oa *officialaccount.OfficialAccount, KbID, openID, content string) (string, error) {
	// 需要权限
	userinfo, err := oa.GetUser().GetUserInfo(openID)
	if err != nil {
		u.logger.Error("GetUserInfo failed", log.Error(err))
	}
	u.logger.Info("userinfo", log.Any("userinfo", userinfo))

	// use ai--> 并且传递用户消息
	getQA := u.getQAFunc(KbID, domain.AppTypeWechatOfficialAccount)

	// 发送消息给用户
	result, err := wechat_official_account.Wechat(ctx, getQA, userinfo, content)
	if err != nil {
		u.logger.Error("wp wechat failed", log.Error(err))
		return "", err
	}
	return result, nil
}

// oa: 微信公众号实例
// openID: 用户的 OpenID
// content: 要发送的文本消息内容
func (u *AppUsecase) SendCustomerServiceMessage(oa *officialaccount.OfficialAccount, openID, content string) error {
	msg := offMessage.NewCustomerTextMessage(openID, content)
	// send to user
	err := oa.GetCustomerMessageManager().Send(msg)
	if err != nil {
		return fmt.Errorf("发送用户消息失败到 %s: %w", openID, err)
	}
	u.logger.Info("成功发送给用户消息", log.String("content", content))
	return nil
}
