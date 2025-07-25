package wechat_official_account

import (
	"context"

	"github.com/chaitin/panda-wiki/pkg/bot"
	"github.com/chaitin/panda-wiki/pkg/bot/wechatservice"
	"github.com/silenceper/wechat/v2/officialaccount/user"

	"github.com/chaitin/panda-wiki/domain"
)

func Wechat(ctx context.Context, GetQA bot.GetQAFun, userinfo *user.Info, content string) (string, error) {

	wccontent, err := GetQA(ctx, content, domain.ConversationInfo{UserInfo: domain.UserInfo{
		UserID:   userinfo.OpenID,     // 用户对话的id
		NickName: userinfo.Nickname,   //用户微信的昵称
		Avatar:   userinfo.Headimgurl, // 用户微信的头像
		From:     domain.MessageFromPrivate,
	}}, "")
	if err != nil {
		return "", err
	}

	var response string
	for v := range wccontent {
		response += v
	}
	response = wechatservice.MarkdowntoText(response)

	return response, nil
}
