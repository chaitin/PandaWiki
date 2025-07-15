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
	"sync"
	"time"

	"github.com/chaitin/panda-wiki/log"

	"github.com/sbzhu/weworkapi_golang/wxbizmsgcrypt"
)

type WechatConfig struct {
	Ctx            context.Context
	CorpID         string
	Token          string
	EncodingAESKey string
	kbID           string
	Secret         string
	AccessToken    string
	TokenExpire    time.Time
	AgentID        string
	logger         *log.Logger
	BaseUrl        string
}

type ReceivedMessage struct {
	ToUserName   string `xml:"ToUserName"`
	FromUserName string `xml:"FromUserName"`
	CreateTime   int64  `xml:"CreateTime"`
	MsgType      string `xml:"MsgType"`
	Content      string `xml:"Content"`
	MsgID        string `xml:"MsgId"`
}

type ResponseMessage struct {
	XMLName      xml.Name `xml:"xml"`
	ToUserName   CDATA    `xml:"ToUserName"`
	FromUserName CDATA    `xml:"FromUserName"`
	CreateTime   int64    `xml:"CreateTime"`
	MsgType      CDATA    `xml:"MsgType"`
	Content      CDATA    `xml:"Content"`
}

type CDATA struct {
	Value string `xml:",cdata"`
}

type BackendRequest struct {
	Question string `json:"question"`
	UserID   string `json:"user_id"`
}

type BackendResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    struct {
		TextResponse string `json:"test_response"`
	} `json:"data"`
}

// UserInfo 用于存储获取到的用户信息
type UserInfo struct {
	Errcode    int    `json:"errcode"`
	Errmsg     string `json:"errmsg"`
	UserID     string `json:"userid"`
	Name       string `json:"name"`
	Department []int  `json:"department"`
	Mobile     string `json:"mobile"`
	Email      string `json:"email"`
	Status     int    `json:"status"`
}

// 获取token的回应的消息
type AccessToken struct {
	Errcode     int    `json:"errcode"`
	Errmsg      string `json:"errmsg"`
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

type TokenCahe struct {
	AccessToken string
	TokenExpire time.Time
	Mutex       sync.Mutex
}

var TokenCache *TokenCahe = &TokenCahe{}

var feedback = "\n\n---  \n\n此回答结果对您有帮助吗?  \n[👍 满意](%s) | [👎 不满意](%s)"
var likeUrl = "%s/feedback?score=1&message_id=%s"
var dislikeUrl = "%s/feedback?score=-1&message_id=%s"

func NewWechatConfig(ctx context.Context, CorpID, Token, EncodingAESKey string, kbid string, secret string, againtid string, logger *log.Logger, baseurl string) (*WechatConfig, error) {
	return &WechatConfig{
		Ctx:            ctx,
		CorpID:         CorpID,
		Token:          Token,
		EncodingAESKey: EncodingAESKey,
		kbID:           kbid,
		Secret:         secret,
		AgentID:        againtid,
		logger:         logger,
		BaseUrl:        baseurl,
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

func (cfg *WechatConfig) Wechat(msg ReceivedMessage, getQA func(ctx context.Context, msg string) (chan string, *string, error)) error {

	token, err := cfg.GetAccessToken()
	if err != nil {
		return err
	}

	err = cfg.Processmessage(msg, getQA, token)
	if err != nil {
		cfg.logger.Error("send to ai failed!", log.Error(err))
		return err
	}

	return nil
}

// forwardToBackend
func (cfg *WechatConfig) Processmessage(msg ReceivedMessage, GetQA func(ctx context.Context, msg string) (chan string, *string, error), token string) error {

	wccontent, message_id, err := GetQA(cfg.Ctx, msg.Content)
	// 拿地址
	cfg.logger.Info("message_id ", log.Any(" ", message_id))

	if err != nil {
		return err
	}

	var response string
	for v := range wccontent {
		response += v
	}
	// contact
	like := fmt.Sprintf(likeUrl, cfg.BaseUrl, *message_id)
	dislike := fmt.Sprintf(dislikeUrl, cfg.BaseUrl, *message_id)
	feedback_data := fmt.Sprintf(feedback, like, dislike)

	cfg.logger.Info("feedback data", log.String(" ", feedback_data))
	response += feedback_data

	msgData := map[string]interface{}{
		"touser":  msg.FromUserName,
		"msgtype": "markdown",
		"agentid": cfg.AgentID,
		"markdown": map[string]string{
			"content": response,
		},
	}

	jsonData, err := json.Marshal(msgData)
	if err != nil {
		return fmt.Errorf("json Marshal failed: %w", err)
	}

	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=%s", token)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))

	if err != nil {
		return fmt.Errorf("post to we failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result struct {
		Errcode int    `json:"errcode"`
		Errmsg  string `json:"errmsg"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("json Unmarshal failed: %w", err)
	}

	if result.Errcode != 0 {
		return fmt.Errorf("wechat Api failed! : %s (code: %d)", result.Errmsg, result.Errcode)
	}

	return nil
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

	// responese
	var encryptMsg []byte
	encryptMsg, errCode := wxcpt.EncryptMsg(string(responseXML), "", "")
	if errCode != nil {
		return nil, errors.New("encryotMsg err")
	}

	return encryptMsg, nil
}

func (cfg *WechatConfig) GetAccessToken() (string, error) {
	TokenCache.Mutex.Lock()
	defer TokenCache.Mutex.Unlock()

	if TokenCache.AccessToken != "" && time.Now().Before(TokenCache.TokenExpire) {
		cfg.logger.Info("access token has existed and is valid")
		return TokenCache.AccessToken, nil
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

	// succcess
	cfg.logger.Info("wechatapp get accesstoken success", log.Any("info", tokenResp.AccessToken))

	TokenCache.AccessToken = tokenResp.AccessToken
	TokenCache.TokenExpire = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	return TokenCache.AccessToken, nil
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
