package wechatservice

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/samber/lo"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
)

func NewWechatServiceConfig(ctx context.Context, logger *log.Logger, CorpID, Token, EncodingAESKey string, kbid string, secret string, containKeywords, equalKeywords []string) (*WechatServiceConfig, error) {
	return &WechatServiceConfig{
		Ctx:             ctx,
		CorpID:          CorpID,
		Token:           Token,
		EncodingAESKey:  EncodingAESKey,
		kbID:            kbid,
		Secret:          secret,
		logger:          logger,
		containKeywords: containKeywords,
		equalKeywords:   equalKeywords,
	}, nil
}

func (cfg *WechatServiceConfig) VerifyUrlWechatService(signature, timestamp, nonce, echostr string) ([]byte, error) {
	wxcpt := wxbizmsgcrypt.NewWXBizMsgCrypt(
		cfg.Token,
		cfg.EncodingAESKey,
		cfg.CorpID,
		wxbizmsgcrypt.XmlType,
	)

	// 验证URL并解密echostr
	decryptEchoStr, errCode := wxcpt.VerifyURL(signature, timestamp, nonce, echostr)
	if errCode != nil {
		return nil, errors.New("server serve fail wechat")
	}
	// success
	return decryptEchoStr, nil
}

func (cfg *WechatServiceConfig) Wechat(msg *WeixinUserAskMsg, getQA bot.GetQAFun) error {
	// 获取accesstoken 方便给用户发送消息
	token, err := cfg.GetAccessToken()
	if err != nil {
		return err
	}
	// 主动拉去用户发送的消息
	msgRet, err := getMsgs(token, msg)
	if err != nil {
		return err
	}
	if msgRet.NextCursor != "" {
		setCursor(msg.OpenKfId, msgRet.NextCursor)
	}

	err = cfg.Processmessage(msgRet, msg, getQA)
	if err != nil {
		cfg.logger.Error("send to ai failed!")
		return err
	}
	return nil
}

// forwardToBackend
func (cfg *WechatServiceConfig) Processmessage(msgRet *MsgRet, Kfmsg *WeixinUserAskMsg, GetQA bot.GetQAFun) error {
	// err message
	cfg.logger.Info("get user message", log.Int("msgRet.Errcode", msgRet.Errcode), log.String("msg.Errmsg", msgRet.Errmsg))

	size := len(msgRet.MsgList)
	if size < 1 {
		return fmt.Errorf("no message received")
	}
	// 如果是用户刚刚进入会话的事件，那么不需要发送消息给用户
	if msgRet.MsgList[size-1].Msgtype == "event" && msgRet.MsgList[size-1].Event.EventType == "enter_session" {
		return nil
	}

	// 每次只是拿去最新的数据
	current := msgRet.MsgList[size-1]
	userId := current.ExternalUserid
	openkfId := current.OpenKfid
	content := current.Text.Content

	token, _ := cfg.GetAccessToken()

	state, err := CheckSessionState(token, userId, openkfId)
	if err != nil {
		cfg.logger.Error("check session state failed", log.Error(err))
		return err
	}
	if state == 3 { // 人工状态 ---已经是人工，那么就不要需要发消息给用户
		cfg.logger.Info("the customer has already in human service")
		return nil
	}
	if len(cfg.equalKeywords) > 0 || len(cfg.containKeywords) > 0 {
		if slices.Contains(cfg.equalKeywords, content) || lo.SomeBy(cfg.containKeywords, func(sub string) bool {
			return strings.Contains(content, sub)
		}) {
			// 改变状态为人工接待
			// 非人工 ->转人工
			humanList, err := cfg.GetKfHumanList(token, openkfId)
			if err != nil {
				cfg.logger.Error("get human list failed", log.Error(err))
				return err
			}
			// 遍历找到可以接待的员工
			for _, servicer := range humanList.ServicerList {
				if servicer.Status == 0 { // 可以接待
					err := ChangeState(token, userId, openkfId, 3, servicer.UserID)
					if err != nil {
						cfg.logger.Error("change state to human failed", log.Error(err))
						return err
					}
					cfg.logger.Info("change state to human successful") // 转人工成功
					return nil
				}
			}
			// 失败
			cfg.logger.Info("no human available")
			return cfg.SendResponseToKfTxt(userId, openkfId, "当前没有可用的人工客服", token)
		}
	}

	// 1. first response to user
	if err := cfg.SendResponseToKfTxt(userId, openkfId, "正在思考您的问题，请稍等...", token); err != nil {
		return err
	}

	// 获取用户的详细信息
	customer, err := GetUserInfo(userId, token)
	if err != nil {
		cfg.logger.Error("get user info failed", log.Error(err))
	}
	cfg.logger.Info("customer info", log.Any("customer", customer))

	id, err := uuid.NewV7()
	if err != nil {
		cfg.logger.Error("failed to generate conversation uuid", log.Error(err))
		id = uuid.New()
	}
	conversationID := id.String()
	wccontent, err := GetQA(cfg.Ctx, content, domain.ConversationInfo{UserInfo: domain.UserInfo{
		UserID:   customer.ExternalUserID, // 用户对话的id
		NickName: customer.Nickname,       //用户微信的昵称
		Avatar:   customer.Avatar,         // 用户微信的头像
		From:     domain.MessageFromPrivate,
	}}, conversationID)
	if err != nil {
		return err
	}
	//2. get baseurl and image path
	info, err := cfg.WeRepo.GetWechatStatic(cfg.Ctx, cfg.kbID, domain.AppTypeWeb)
	if err != nil {
		return err
	}

	//2. go send to ai and store in map--> get conversation-id
	if _, ok := domain.ConversationManager.Load(conversationID); !ok {
		state := &domain.ConversationState{
			Question:         content,
			NotificationChan: make(chan string), // notification channel
			IsVisited:        false,
		}
		domain.ConversationManager.Store(conversationID, state)

		go cfg.SendQuestionToAI(conversationID, wccontent)
	}
	// 3. second send url to user
	return cfg.SendResponseToKfUrl(userId, openkfId, conversationID, token, content, info.BaseUrl, info.ImagePath)
}

func (cfg *WechatServiceConfig) SendResponseToKfUrl(userId, openkfId, conversationID, token, question, baseUrl, image string) error {
	var imageId string
	var err error
	if image != "" && !strings.HasPrefix(image, "data:image/") { // user own image and not base64 image
		imageId, err = GetUserImageID(token, fmt.Sprintf("%s%s", "http://panda-wiki-minio:9000", image))
		if err != nil {
			return err
		}
	} else if strings.HasPrefix(image, "data:image/") {
		// 解析base64
		imageId, err = GetDefaultImageID(token, image)
		if err != nil {
			return err
		}
	} else {
		// 解析base64 -> default image
		imageId, err = GetDefaultImageID(token, domain.DefaultPandaWikiIconB64)
		if err != nil {
			return err
		}
	}

	reply := ReplyMsgUrl{
		Touser:   userId,
		OpenKfid: openkfId,
		Msgtype:  "link",
		Link: Link{
			Url:          fmt.Sprintf("%s/h5-chat?id=%s", baseUrl, conversationID),
			Desc:         "本回答由 LiteWiki 基于 AI 生成，仅供参考。",
			Title:        question,
			ThumbMediaID: imageId,
		},
	}

	jsonData, err := json.Marshal(reply)
	if err != nil {
		return fmt.Errorf("json Marshal failed: %w", err)
	}
	return cfg.SendMessage(jsonData, token)
}

func (cfg *WechatServiceConfig) SendResponseToKfTxt(userId string, openkfId string, response string, token string) error {
	// send text data to user
	reply := ReplyMsg{
		Touser:   userId,
		OpenKfid: openkfId,
		Msgtype:  "text",
		Text: struct {
			Content string `json:"content,omitempty"`
		}{Content: response},
	}

	jsonData, err := json.Marshal(reply)
	if err != nil {
		return fmt.Errorf("json Marshal failed: %w", err)
	}
	return cfg.SendMessage(jsonData, token)
}

func (cfg *WechatServiceConfig) SendMessage(jsonData []byte, token string) error {
	// 发送消息给客服
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/send_msg?access_token=%s", token)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("post to wechatservice failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response body failed: %w", err)
	}

	var res struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		MsgID   string `json:"msgid"`
	}

	if err := json.Unmarshal(body, &res); err != nil {
		cfg.logger.Error("解析响应失败", log.Error(err))
		return err
	}

	if res.ErrCode != 0 {
		cfg.logger.Error("发送给微信客服消息失败", log.Any("errcode", res.ErrCode))
		return err
	}
	// 发送消息给微信客服成功
	s := string(body)
	cfg.logger.Info("response from wechatservice success", log.Any("body", s))

	return nil
}

func (cfg *WechatServiceConfig) GetAccessToken() (string, error) {
	// Generate cache key based on app credentials
	cacheKey := getTokenCacheKey(cfg.kbID, cfg.Secret)

	// Get or create token cache for this app
	tokenCacheMapMutex.Lock()
	tokenCache, exists := tokenCacheMap[cacheKey]
	if !exists {
		tokenCache = &TokenCache{}
		tokenCacheMap[cacheKey] = tokenCache
	}
	tokenCacheMapMutex.Unlock()

	// Lock the specific token cache for this app
	tokenCache.Mutex.Lock()
	defer tokenCache.Mutex.Unlock()

	if tokenCache.AccessToken != "" && time.Now().Before(tokenCache.TokenExpire) {
		cfg.logger.Info("access token has existed and is valid")
		return tokenCache.AccessToken, nil
	}

	if cfg.Secret == "" || cfg.CorpID == "" {
		return "", errors.New("secret or corpid is not right")
	}

	// get AccessToken--请求微信客服token
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", cfg.CorpID, cfg.Secret)

	resp, err := http.Get(url)
	if err != nil {
		return "", errors.New("get wechatservice accesstoken failed")
	}
	defer resp.Body.Close()

	var tokenResp AccessToken // 获取到token消息

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", errors.New("json decode wechat resp failed")
	}

	if tokenResp.Errcode != 0 {
		return "", errors.New("get wechat access token failed")
	}

	// success
	cfg.logger.Info("wechatservice get accesstoken success", log.Any("info", tokenResp.AccessToken))

	tokenCache.AccessToken = tokenResp.AccessToken
	tokenCache.TokenExpire = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	return tokenCache.AccessToken, nil
}

// 解析微信客服消息
func (cfg *WechatServiceConfig) UnmarshalMsg(decryptMsg []byte) (*WeixinUserAskMsg, error) {
	var msg WeixinUserAskMsg
	err := xml.Unmarshal([]byte(decryptMsg), &msg)
	return &msg, err
}

func (cfg *WechatServiceConfig) GetKfHumanList(token string, KfId string) (*HumanList, error) {
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/servicer/list?access_token=%s&open_kfid=%s", token, KfId)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var servicerResp HumanList
	if err := json.Unmarshal(body, &servicerResp); err != nil {
		return nil, err
	}
	if servicerResp.ErrCode != 0 {
		return nil, fmt.Errorf("获取客服列表失败: %d, %s", servicerResp.ErrCode, servicerResp.ErrMsg)
	}

	return &servicerResp, nil
}

// answer set into redis queue and set useful time
func (cfg *WechatServiceConfig) SendQuestionToAI(conversationID string, wccontent chan string) {
	// send message
	val, _ := domain.ConversationManager.Load(conversationID)
	state := val.(*domain.ConversationState)
	for content := range wccontent {
		state.Mutex.Lock()
		if state.IsVisited {
			state.NotificationChan <- content // notify has new data
		}
		state.Buffer.WriteString(content)
		state.Mutex.Unlock()
	}
	// end sent notification
	defer func() {
		close(state.NotificationChan)
		domain.ConversationManager.Delete(conversationID)
	}()
}
