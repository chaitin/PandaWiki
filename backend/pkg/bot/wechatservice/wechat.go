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
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
)

type WechatServiceConfig struct {
	Ctx            context.Context
	CorpID         string
	Token          string
	EncodingAESKey string
	kbID           string
	Secret         string
	logger         *log.Logger
}

// 微信客服发送的消息
type WeixinUserAskMsg struct {
	ToUserName string `xml:"ToUserName"`
	CreateTime int64  `xml:"CreateTime"`
	MsgType    string `xml:"MsgType"`
	Event      string `xml:"Event"`
	Token      string `xml:"Token"`
	OpenKfId   string `xml:"OpenKfId"`
}

type AccessToken struct {
	Errcode     int    `json:"errcode"`
	Errmsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type MsgRequest struct {
	Cursor      string `json:"cursor"`
	Token       string `json:"token"`
	Limit       int    `json:"limit"`
	VoiceFormat int    `json:"voice_format"`
	OpenKfid    string `json:"open_kfid"`
}

type MsgRet struct {
	Errcode    int    `json:"errcode"`
	Errmsg     string `json:"errmsg"`
	NextCursor string `json:"next_cursor"` // 游标
	MsgList    []Msg  `json:"msg_list"`
	HasMore    int    `json:"has_more"`
}

type Msg struct {
	Msgid    string `json:"msgid"`
	SendTime int64  `json:"send_time"`
	Origin   int    `json:"origin"`
	Msgtype  string `json:"msgtype"`
	Event    struct {
		EventType      string `json:"event_type"`
		Scene          string `json:"scene"`
		OpenKfid       string `json:"open_kfid"`
		ExternalUserid string `json:"external_userid"`
		WelcomeCode    string `json:"welcome_code"`
	} `json:"event"`
	Text struct {
		Content string `json:"content"`
	} `json:"text"`
	OpenKfid       string `json:"open_kfid"`
	ExternalUserid string `json:"external_userid"`
}

type ReplyMsg struct {
	Touser   string `json:"touser,omitempty"`
	OpenKfid string `json:"open_kfid,omitempty"`
	Msgid    string `json:"msgid,omitempty"`
	Msgtype  string `json:"msgtype,omitempty"`
	Text     struct {
		Content string `json:"content,omitempty"`
	} `json:"text,omitempty"`
}

type TokenCache struct {
	AccessToken string
	TokenExpire time.Time
	Mutex       sync.Mutex
}

var tokenCache *TokenCache = &TokenCache{}

// 获取用户消息应该得到的响应
type WechatCustomerResponse struct {
	ErrCode                int        `json:"errcode"`
	ErrMsg                 string     `json:"errmsg"`
	CustomerList           []Customer `json:"customer_list"`
	InvalidExternalUserIDs []string   `json:"invalid_external_userid"`
}

type Customer struct {
	ExternalUserID string `json:"external_userid"`
	Nickname       string `json:"nickname"`
	Avatar         string `json:"avatar"`
	Gender         int    `json:"gender"`
	UnionID        string `json:"unionid"`
}

type UerInfoRequest struct {
	UserID         []string `json:"external_userid_list"`
	SessionContext int      `json:"need_enter_session_context"`
}

// 存储ai知识库获取的cursor值以客服为标准，方便拉取用户的消息
var KfCursors = &sync.Map{}

// 读取 cursor，以客服账号的消息作为key，返回对应的cursor值
func getCursor(openKfId string) string {
	cursorValue, _ := KfCursors.Load(openKfId)
	cursor, _ := cursorValue.(string)
	return cursor
}

// 存储 cursor
func setCursor(openKfId, cursor string) {
	KfCursors.Store(openKfId, cursor)
}

func NewWechatServiceConfig(ctx context.Context, CorpID, Token, EncodingAESKey string, kbid string, secret string, logger *log.Logger) (*WechatServiceConfig, error) {
	return &WechatServiceConfig{
		Ctx:            ctx,
		CorpID:         CorpID,
		Token:          Token,
		EncodingAESKey: EncodingAESKey,
		kbID:           kbid,
		Secret:         secret,
		logger:         logger,
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
	// 拿到了之后处理用户的消息
	// 先更新对应的msg的cursor
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
	// // 将用户的消息转发到ai获得解答
	// cfg.logger.Info("get uerinfo", log.Any("msgRet", msgRet))

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
	// extrenaluserid := current.ExternalUserid //拉取数据，之后进行改变状态

	// 重新获取token，之后发送消息给用户
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

	if content == "转人工" || content == "人工客服" {
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
		return cfg.SendResponseToKf(userId, openkfId, "当前没有可用的人工客服", token)
	}

	// 获取用户的详细信息
	customer, err := GetUserInfo(userId, token)
	if err != nil {
		cfg.logger.Error("get user info failed", log.Error(err))
	}
	cfg.logger.Info("customer info", log.Any("customer", customer))

	// 获取问题答案
	wccontent, err := GetQA(cfg.Ctx, content, domain.ConversationInfo{UserInfo: domain.UserInfo{
		UserID:   customer.ExternalUserID, // 用户对话的id
		NickName: customer.Nickname,       //用户微信的昵称
		Avatar:   customer.Avatar,         // 用户微信的头像
		From:     domain.MessageFromPrivate,
	}}, "")

	if err != nil {
		return err
	}

	var response string
	for v := range wccontent {
		response += v
	}
	response = MarkdowntoText(response)
	return cfg.SendResponseToKf(userId, openkfId, response, token)
}

func (cfg *WechatServiceConfig) SendResponseToKf(userId string, openkfId string, response string, token string) error {
	// 将问题答案发给用户
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

// 主动拉取用户的消息
func getMsgs(accessToken string, msg *WeixinUserAskMsg) (*MsgRet, error) {
	var msgRet MsgRet
	// 拉取消息的路由
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/sync_msg?access_token=%s", accessToken)
	cursor := getCursor(msg.OpenKfId)

	msgBody := MsgRequest{
		OpenKfid:    msg.OpenKfId,
		Token:       msg.Token,
		Limit:       1000,
		VoiceFormat: 0,
		Cursor:      cursor,
	}

	jsonBody, _ := json.Marshal(msgBody)

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody)) // 得到对应的回复
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	// 反序列化之后
	if err := json.Unmarshal([]byte(string(body)), &msgRet); err != nil {
		return nil, err
	}
	return &msgRet, nil
}

type Status struct {
	ErrCode       int    `json:"errcode"`
	ErrMsg        string `json:"errmsg"`
	ServiceState  int    `json:"service_state"`
	ServiceUserId string `json:"servicer_userid"`
}

func CheckSessionState(token, extrenaluserid, kfId string) (int, error) {
	var statusrequest struct {
		OpenKfId       string `json:"open_kfid"`
		ExternalUserid string `json:"external_userid"`
	}
	statusrequest.OpenKfId = kfId
	statusrequest.ExternalUserid = extrenaluserid
	// 将请求体转换为JSON
	jsonBody, err := json.Marshal(statusrequest)
	if err != nil {
		return 0, err
	}
	// 获取状态信息
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/service_state/get?access_token=%s", token)
	resp, _ := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, fmt.Errorf("读取响应失败: %v", err)
	}

	var response Status

	if err := json.Unmarshal(body, &response); err != nil {
		return 0, fmt.Errorf("解析响应失败: %v", err)
	}
	// 得到用户的状态
	if response.ErrCode != 0 {
		return 0, fmt.Errorf("获取会话状态失败: %s", response.ErrMsg)
	}
	return response.ServiceState, nil
}

func ChangeState(token, extrenaluserId, kfId string, state int, serviceId string) error {
	var changestate struct {
		OpenKfId       string `json:"open_kfid"`
		ExternalUserid string `json:"external_userid"`
		ServiceState   int    `json:"service_state"`
		ServicerUserId string `json:"servicer_userid"`
	}
	changestate.OpenKfId = kfId
	changestate.ExternalUserid = extrenaluserId
	changestate.ServiceState = state
	changestate.ServicerUserId = serviceId
	jsonBody, err := json.Marshal(changestate)
	if err != nil {
		return err
	}
	// 发送请求
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/service_state/trans?access_token=%s", token)
	resp, _ := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("读取响应失败: %v", err)
	}
	// 解析响应
	var response struct {
		ErrCode int    `json:"errcode"`
		ErrMsg  string `json:"errmsg"`
		MsgCode string `json:"msg_code"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("解析响应失败: %v", err)
	}
	// 得到用户的状态
	if response.ErrCode != 0 {
		return fmt.Errorf("改变用户状态失败: %s", response.ErrMsg)
	}
	return nil
}

func GetUserInfo(userid string, accessToken string) (*Customer, error) {
	userInfoRequest := UerInfoRequest{
		UserID:         []string{userid},
		SessionContext: 0,
	}
	// 请求获取用户信息的url
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/kf/customer/batchget?access_token=%s", accessToken)

	jsonBody, err := json.Marshal(userInfoRequest)
	if err != nil {
		return nil, err
	}
	// post获取用户的消息信息
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var userInfo WechatCustomerResponse
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, err
	}

	if userInfo.ErrCode != 0 {
		return nil, fmt.Errorf("获取用户信息失败: %d, %s", userInfo.ErrCode, userInfo.ErrMsg)
	}

	return &userInfo.CustomerList[0], nil
}

// markdowntotext
func MarkdowntoText(md string) string {
	md = regexp.MustCompile(`(?m)^#+\s*(.*)$`).ReplaceAllString(md, "$1")
	md = regexp.MustCompile(`\*\*([^*]+)\*\*`).ReplaceAllString(md, "$1")
	md = regexp.MustCompile(`(?m)^>\s*(.*)$`).ReplaceAllString(md, "【引用】$1")
	md = regexp.MustCompile(`(?m)^-{3,}$`).ReplaceAllString(md, "─────────")
	md = regexp.MustCompile(`\n{3,}`).ReplaceAllString(md, "\n\n")
	md = regexp.MustCompile(`\[\[(\d+)\]\([^)]+\)\]`).ReplaceAllString(md, "[$1]")
	md = regexp.MustCompile(`\[(\d+)\]\.\s*\[([^\]]+)\]\([^)]+\)`).ReplaceAllString(md, "[$1]. $2")
	md = regexp.MustCompile(`(?m)^【引用】\[(\d+)\].\s*([^\n(]+)\s*\([^)]+\)`).ReplaceAllString(md, "【引用】[$1]. $2")
	return strings.TrimSpace(md)
}

type HumanList struct {
	ErrCode      int            `json:"errcode"`
	ErrMsg       string         `json:"errmsg"`
	ServicerList []ServicerList `json:"servicer_list"`
}

type ServicerList struct {
	UserID string `json:"userid"`
	Status int    `json:"status"`
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
