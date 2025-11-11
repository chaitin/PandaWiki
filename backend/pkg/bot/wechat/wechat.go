package wechat

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
)

func NewWechatConfig(ctx context.Context, CorpID, Token, EncodingAESKey string, kbid string, secret string, agentID string, logger *log.Logger) (*WechatConfig, error) {
	return &WechatConfig{
		Ctx:            ctx,
		CorpID:         CorpID,
		Token:          Token,
		EncodingAESKey: EncodingAESKey,
		kbID:           kbid,
		Secret:         secret,
		AgentID:        agentID,
		logger:         logger,
	}, nil
}

func (cfg *WechatConfig) VerifyUrlWechatAPP(signature, timestamp, nonce, echostr string) ([]byte, error) {
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

func (cfg *WechatConfig) Wechat(msg ReceivedMessage, getQA bot.GetQAFun, userinfo *UserInfo) error {

	token, err := cfg.GetAccessToken()
	if err != nil {
		return err
	}
	err = cfg.ProcessMessage(msg, getQA, token, userinfo)
	if err != nil {
		cfg.logger.Error("send to ai failed!", log.Error(err))
		return err
	}
	return nil
}

// forwardToBackend
func (cfg *WechatConfig) ProcessMessage(msg ReceivedMessage, GetQA bot.GetQAFun, token string, userinfo *UserInfo) error {
	// 1. get ai channel
	id, err := uuid.NewV7()
	if err != nil {
		cfg.logger.Error("failed to generate conversation uuid", log.Error(err))
		id = uuid.New()
	}
	conversationID := id.String()

	wccontent, err := GetQA(cfg.Ctx, msg.Content, domain.ConversationInfo{
		UserInfo: domain.UserInfo{
			UserID:   userinfo.UserID,
			NickName: userinfo.Name,
			From:     domain.MessageFromPrivate,
		}}, conversationID)

	if err != nil {
		return err
	}

	//2. go send to ai and store in map--> get conversation-id
	if _, ok := domain.ConversationManager.Load(conversationID); !ok {
		state := &domain.ConversationState{
			Question:         msg.Content,
			NotificationChan: make(chan string), // notification channel
			IsVisited:        false,
		}
		domain.ConversationManager.Store(conversationID, state)

		go cfg.SendQuestionToAI(conversationID, wccontent)
	}

	baseUrl, err := cfg.WeRepo.GetWechatBaseURL(cfg.Ctx, cfg.kbID)
	if err != nil {
		return err
	}

	//3.send url to user
	Errcode, Errmsg, err := cfg.SendURLToUser(msg.FromUserName, msg.Content, token, conversationID, baseUrl)
	if err != nil {
		return err
	}
	if Errcode != 0 {
		return fmt.Errorf("wechat Api failed : %s (code: %d)", Errmsg, Errcode)
	}
	return nil
}

// SendResponseToUser
func (cfg *WechatConfig) SendURLToUser(touser, question, token, conversationID, baseUrl string) (int, string, error) {
	msgData := map[string]interface{}{
		"touser":  touser,
		"msgtype": "textcard",
		"agentid": cfg.AgentID,
		"textcard": map[string]interface{}{
			"title":       question,
			"description": "<div class = \"highlight\">本回答由 LiteWiki 基于 AI 生成，仅供参考。</div>",
			"url":         fmt.Sprintf("%s/h5-chat?id=%s", baseUrl, conversationID),
		},
	}

	jsonData, err := json.Marshal(msgData)
	if err != nil {
		return 0, "", err
	}

	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", token)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))

	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Errcode int    `json:"errcode"`
		Errmsg  string `json:"errmsg"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, "", err
	}
	return result.Errcode, result.Errmsg, nil
}

// SendResponseToUser
func (cfg *WechatConfig) SendResponseToUser(response string, touser string, token string) (int, string, error) {

	msgData := map[string]interface{}{
		"touser":  touser,
		"msgtype": "markdown",
		"agentid": cfg.AgentID,
		"markdown": map[string]string{
			"content": response,
		},
	}

	jsonData, err := json.Marshal(msgData)
	if err != nil {
		return 0, "", err
	}

	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", token)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))

	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Errcode int    `json:"errcode"`
		Errmsg  string `json:"errmsg"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, "", err
	}
	return result.Errcode, result.Errmsg, nil
}

// SendResponse
func (cfg *WechatConfig) SendResponse(msg ReceivedMessage, content string) ([]byte, error) {

	responseMsg := ResponseMessage{
		ToUserName:   CDATA{msg.FromUserName},
		FromUserName: CDATA{msg.ToUserName},
		CreateTime:   msg.CreateTime,
		MsgType:      CDATA{"text"},
		Content:      CDATA{content},
	}

	// XML
	responseXML, err := xml.Marshal(responseMsg)
	if err != nil {
		cfg.logger.Error("marshal response failed", log.Error(err))
		return nil, err
	}

	wxcpt := wxbizmsgcrypt.NewWXBizMsgCrypt(cfg.Token, cfg.EncodingAESKey, cfg.CorpID, wxbizmsgcrypt.XmlType)

	// response
	var encryptMsg []byte
	encryptMsg, errCode := wxcpt.EncryptMsg(string(responseXML), "", "")
	if errCode != nil {
		return nil, errors.New("encryotMsg err")
	}

	return encryptMsg, nil
}

func (cfg *WechatConfig) GetAccessToken() (string, error) {
	// Generate cache key based on app credentials
	cacheKey := getTokenCacheKey(cfg.kbID, cfg.AgentID)

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
		return "", errors.New("get wechatapp accesstoken failed")
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
	cfg.logger.Info("wechatapp get accesstoken success", log.Any("info", tokenResp.AccessToken))

	tokenCache.AccessToken = tokenResp.AccessToken
	tokenCache.TokenExpire = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	return tokenCache.AccessToken, nil
}

func (cfg *WechatConfig) GetUserInfo(username string) (*UserInfo, error) {

	accessToken, err := cfg.GetAccessToken()
	if err != nil {
		return nil, err
	}
	// 请求获取用户的内容
	resp, err := http.Get(fmt.Sprintf(
		"https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=%s&userid=%s",
		accessToken, username))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// cfg.logger.Info("获取用户信息成功", log.Any("body", body))

	var userInfo UserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	if userInfo.Errcode != 0 {
		return nil, fmt.Errorf("获取用户信息失败: %d, %s", userInfo.Errcode, userInfo.Errmsg)
	}

	return &userInfo, nil
}

func (cfg *WechatConfig) UnmarshalMsg(decryptMsg []byte) (*ReceivedMessage, error) {
	var msg ReceivedMessage
	err := xml.Unmarshal([]byte(decryptMsg), &msg)
	return &msg, err
}

// answer set into conversation state buffer
func (cfg *WechatConfig) SendQuestionToAI(conversationID string, wccontent chan string) {
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
