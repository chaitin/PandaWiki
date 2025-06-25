package wechat

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

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

func NewWechatConfig(ctx context.Context, CorpID, Token, EncodingAESKey string, kbid string, secret string, againtid string) (*WechatConfig, error) {
	return &WechatConfig{
		Ctx:            ctx,
		CorpID:         CorpID,
		Token:          Token,
		EncodingAESKey: EncodingAESKey,
		kbID:           kbid,
		Secret:         secret,
		AgentID:        againtid,
	}, nil
}

func (cfg *WechatConfig) VerifiyUrl(signature, timestamp, nonce, echostr string) ([]byte, error) {
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

func (cfg *WechatConfig) Wechat(signature, timestamp, nonce string, body []byte, getQA func(ctx context.Context, msg string) (chan string, error)) error {

	wxcpt := wxbizmsgcrypt.NewWXBizMsgCrypt(cfg.Token, cfg.EncodingAESKey, cfg.CorpID, wxbizmsgcrypt.XmlType)

	// 解密消息
	var decryptMsg []byte
	decryptMsg, errCode := wxcpt.DecryptMsg(signature, timestamp, nonce, body)
	if errCode != nil {
		return errors.New("Decrypt Message failed")
	}

	var msg ReceivedMessage
	err := xml.Unmarshal([]byte(decryptMsg), &msg)
	if err != nil {
		return err
	}

	token, err := cfg.GetAccessToken()
	if err != nil {
		return err
	}

	err = cfg.Processmessage(msg, getQA, token)
	if err != nil {
		log.Printf("send to ai failed! : %v", err)
		return err
	}

	return nil
}

// forwardToBackend
func (cfg *WechatConfig) Processmessage(msg ReceivedMessage, GetQA func(ctx context.Context, msg string) (chan string, error), token string) error {

	wccontent, err := GetQA(cfg.Ctx, msg.Content)

	if err != nil {
		return err
	}

	var response string
	for v := range wccontent {
		response += v
	}

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
		return fmt.Errorf("wechat Api fialed! : %s (code: %d)", result.Errmsg, result.Errcode)
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
		log.Printf("xml Marshal failed: %v", err)
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

	if cfg.AccessToken != "" && time.Now().Before(cfg.TokenExpire) {
		return cfg.AccessToken, nil
	}

	if cfg.Secret == "" {
		return "", errors.New("secret is not right")
	}

	// get AccessToken
	url := fmt.Sprintf("https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=%s&corpsecret=%s", cfg.CorpID, cfg.Secret)

	resp, err := http.Get(url)
	if err != nil {
		return "", errors.New("get wechat accesstoken failed")
	}

	var tokenResp struct {
		Errcode     int    `json:"errcode"`
		Errmsg      string `json:"errmsg"`
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", errors.New("json decode wechat resp failed")
	}

	if tokenResp.Errcode != 0 {
		return "", errors.New("get wechat accesstoken failed!")
	}

	// succcess

	cfg.AccessToken = tokenResp.AccessToken
	cfg.TokenExpire = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)

	return cfg.AccessToken, nil
}
