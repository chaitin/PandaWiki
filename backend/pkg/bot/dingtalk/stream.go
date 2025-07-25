package dingtalk

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dingtalkcard_1_0 "github.com/alibabacloud-go/dingtalk/card_1_0"
	dingtalkoauth2_1_0 "github.com/alibabacloud-go/dingtalk/oauth2_1_0"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/google/uuid"
	"github.com/open-dingtalk/dingtalk-stream-sdk-go/chatbot"
	"github.com/open-dingtalk/dingtalk-stream-sdk-go/client"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
)

type DingTalkClient struct {
	ctx          context.Context
	cancel       context.CancelFunc
	clientID     string
	clientSecret string
	templateID   string // 4d18414c-aabc-4ec8-9e67-4ceefeada72a.schema
	oauthClient  *dingtalkoauth2_1_0.Client
	cardClient   *dingtalkcard_1_0.Client
	getQA        bot.GetQAFun
	logger       *log.Logger
	tokenCache   struct {
		accessToken string
		expireAt    time.Time
	}
	tokenMutex sync.RWMutex
}

func NewDingTalkClient(ctx context.Context, cancel context.CancelFunc, clientId, clientSecret, templateID string, logger *log.Logger, getQA bot.GetQAFun) (*DingTalkClient, error) {
	config := &openapi.Config{}
	config.Protocol = tea.String("https")
	config.RegionId = tea.String("central")
	oauthClient, err := dingtalkoauth2_1_0.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create oauth client: %w", err)
	}
	cardClient, err := dingtalkcard_1_0.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create card client: %w", err)
	}
	return &DingTalkClient{
		ctx:          ctx,
		cancel:       cancel,
		clientID:     clientId,
		clientSecret: clientSecret,
		templateID:   templateID,
		oauthClient:  oauthClient,
		cardClient:   cardClient,
		getQA:        getQA,
		logger:       logger,
	}, nil
}

func (c *DingTalkClient) GetAccessToken() (string, error) {
	c.tokenMutex.RLock()
	// TODO: use redis cache
	if c.tokenCache.accessToken != "" && time.Now().Before(c.tokenCache.expireAt) {
		token := c.tokenCache.accessToken
		c.tokenMutex.RUnlock()
		return token, nil
	}
	c.tokenMutex.RUnlock()

	c.tokenMutex.Lock()
	defer c.tokenMutex.Unlock()

	if c.tokenCache.accessToken != "" && time.Now().Before(c.tokenCache.expireAt) {
		return c.tokenCache.accessToken, nil
	}

	request := &dingtalkoauth2_1_0.GetAccessTokenRequest{
		AppKey:    tea.String(c.clientID),
		AppSecret: tea.String(c.clientSecret),
	}
	response, tryErr := func() (_resp *dingtalkoauth2_1_0.GetAccessTokenResponse, _e error) {
		defer func() {
			if r := tea.Recover(recover()); r != nil {
				_e = r
			}
		}()
		_resp, _err := c.oauthClient.GetAccessToken(request)
		if _err != nil {
			return nil, _err
		}

		return _resp, nil
	}()
	if tryErr != nil {
		return "", tryErr
	}
	accessToken := *response.Body.AccessToken
	c.logger.Info("get access token", log.String("access_token", accessToken), log.Int("expire_in", int(*response.Body.ExpireIn)))
	c.tokenCache.accessToken = accessToken
	c.tokenCache.expireAt = time.Now().Add(time.Duration(*response.Body.ExpireIn-300) * time.Second)

	return c.tokenCache.accessToken, nil
}

func (c *DingTalkClient) UpdateAIStreamCard(trackID, content string, isFinalize bool) error {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return fmt.Errorf("failed to get access token while updating interactive card: %w", err)
	}

	headers := &dingtalkcard_1_0.StreamingUpdateHeaders{
		XAcsDingtalkAccessToken: tea.String(accessToken),
	}
	request := &dingtalkcard_1_0.StreamingUpdateRequest{
		OutTrackId: tea.String(trackID),
		Guid:       tea.String(uuid.New().String()),
		Key:        tea.String("content"),
		Content:    tea.String(content),
		IsFull:     tea.Bool(true),
		IsFinalize: tea.Bool(isFinalize),
		IsError:    tea.Bool(false),
	}
	_, err = c.cardClient.StreamingUpdateWithOptions(request, headers, &util.RuntimeOptions{})
	if err != nil {
		return fmt.Errorf("failed to update card: %w", err)
	}
	return nil
}

func (c *DingTalkClient) CreateAndDeliverCard(ctx context.Context, trackID string, data *chatbot.BotCallbackDataModel) error {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return fmt.Errorf("failed to get access token while creating and delivering card: %w", err)
	}

	createAndDeliverHeaders := &dingtalkcard_1_0.CreateAndDeliverHeaders{}
	createAndDeliverHeaders.XAcsDingtalkAccessToken = tea.String(accessToken)

	cardDataCardParamMap := map[string]*string{
		"content": tea.String(""),
	}
	cardData := &dingtalkcard_1_0.CreateAndDeliverRequestCardData{
		CardParamMap: cardDataCardParamMap,
	}

	createAndDeliverRequest := &dingtalkcard_1_0.CreateAndDeliverRequest{
		CardTemplateId: tea.String(c.templateID),
		OutTrackId:     tea.String(trackID),
		CardData:       cardData,
		CallbackType:   tea.String("STREAM"),
		ImGroupOpenSpaceModel: &dingtalkcard_1_0.CreateAndDeliverRequestImGroupOpenSpaceModel{
			SupportForward: tea.Bool(true),
		},
		ImRobotOpenSpaceModel: &dingtalkcard_1_0.CreateAndDeliverRequestImRobotOpenSpaceModel{
			SupportForward: tea.Bool(true),
		},
		UserIdType: tea.Int32(1),
	}
	switch data.ConversationType {
	case "2": // 群聊
		openSpaceId := fmt.Sprintf("dtv1.card//%s.%s", "IM_GROUP", data.ConversationId)
		createAndDeliverRequest.SetOpenSpaceId(openSpaceId)
		createAndDeliverRequest.SetImGroupOpenDeliverModel(
			&dingtalkcard_1_0.CreateAndDeliverRequestImGroupOpenDeliverModel{
				RobotCode: tea.String(c.clientID),
			})
	case "1": // Im机器人单聊
		openSpaceId := fmt.Sprintf("dtv1.card//%s.%s", "IM_ROBOT", data.SenderStaffId)
		createAndDeliverRequest.SetOpenSpaceId(openSpaceId)
		createAndDeliverRequest.SetImRobotOpenDeliverModel(&dingtalkcard_1_0.CreateAndDeliverRequestImRobotOpenDeliverModel{
			SpaceType: tea.String("IM_GROUP"),
		})
	default:
		return fmt.Errorf("invalid conversation type: %s", data.ConversationType)
	}

	_, err = c.cardClient.CreateAndDeliverWithOptions(createAndDeliverRequest, createAndDeliverHeaders, &util.RuntimeOptions{})
	if err != nil {
		return fmt.Errorf("failed to create and deliver card: %w", err)
	}
	return nil
}

func (c *DingTalkClient) OnChatBotMessageReceived(ctx context.Context, data *chatbot.BotCallbackDataModel) ([]byte, error) {
	question := data.Text.Content
	question = strings.TrimSpace(question)
	trackID := uuid.New().String()
	// conversation_type == 1 表示机器人单聊，==2 表示群聊中@机器人
	c.logger.Info("dingtalk client received message", log.String("question", question), log.String("track_id", trackID), log.String("conversation_type", data.ConversationType))
	// create and deliver card
	if err := c.CreateAndDeliverCard(ctx, trackID, data); err != nil {
		c.logger.Error("CreateAndDeliverCard", log.Error(err))
		return nil, err
	}

	initialContent := fmt.Sprintf("**%s**\n\n%s", question, "稍等，让我想一想……")

	if err := c.UpdateAIStreamCard(trackID, initialContent, false); err != nil {
		c.logger.Error("UpdateInteractiveCard", log.Error(err))
		return nil, nil
	}
	// 初始化 默认为空
	convInfo := &domain.ConversationInfo{
		UserInfo: domain.UserInfo{
			From: domain.MessageFromPrivate, // 默认是私聊
		},
	}
	// 之前创建并且发送卡片消息，获取用户基本信息
	userinfo, err := c.GetUserInfo(data.SenderStaffId)
	if err != nil {
		c.logger.Error("GetUserInfo failed", log.Error(err))
	} else {
		c.logger.Info("GetUserInfo success", log.Any("userinfo", userinfo))
		convInfo.UserInfo.UserID = userinfo.Result.Userid
		convInfo.UserInfo.NickName = userinfo.Result.Name
		convInfo.UserInfo.Avatar = userinfo.Result.Avatar
		convInfo.UserInfo.Email = userinfo.Result.Email
	}
	if data.ConversationType == "2" { // 群聊
		convInfo.UserInfo.From = domain.MessageFromGroup
	} else { // 单聊
		convInfo.UserInfo.From = domain.MessageFromPrivate
	}

	contentCh, err := c.getQA(ctx, question, *convInfo, "")
	if err != nil {
		c.logger.Error("dingtalk client failed to get answer", log.Error(err))
		if err := c.UpdateAIStreamCard(trackID, "出错了，请稍后再试", true); err != nil {
			c.logger.Error("UpdateInteractiveCard in contentCh failed", log.Error(err))
		}
		return nil, nil
	}

	updateTicker := time.NewTicker(1500 * time.Millisecond)
	defer updateTicker.Stop()

	ans := fmt.Sprintf("**%s**\n\n", question)
	fullContent := fmt.Sprintf("**%s**\n\n", question)
	for {
		select {
		case content, ok := <-contentCh:
			if !ok {
				if err := c.UpdateAIStreamCard(trackID, fullContent, true); err != nil {
					c.logger.Error("UpdateInteractiveCard in contentCh", log.Error(err))
					if err := c.UpdateAIStreamCard(trackID, "出错了，请稍后再试", true); err != nil {
						c.logger.Error("UpdateInteractiveCard in contentCh failed", log.Error(err))
					}
				}
				return []byte(""), nil
			}
			fullContent += content
		case <-updateTicker.C:
			if fullContent == ans {
				continue
			}
			if err := c.UpdateAIStreamCard(trackID, fullContent, false); err != nil {
				c.logger.Error("UpdateInteractiveCard in ticker", log.Error(err))
				if err := c.UpdateAIStreamCard(trackID, "出错了，请稍后再试", true); err != nil {
					c.logger.Error("UpdateInteractiveCard in ticker failed", log.Error(err))
				}
				return []byte(""), nil
			}
		}
	}
}

func (c *DingTalkClient) Start() error {
	cli := client.NewStreamClient(client.WithAppCredential(client.NewAppCredentialConfig(
		c.clientID,
		c.clientSecret,
	)))
	cli.RegisterChatBotCallbackRouter(c.OnChatBotMessageReceived)
	if err := cli.Start(c.ctx); err != nil {
		return err
	}

	<-c.ctx.Done()

	return nil
}

func (c *DingTalkClient) Stop() {
	c.cancel()
}

// 钉钉的用户信息
type UserDetailResponse struct {
	ErrCode int         `json:"errcode"`
	ErrMsg  string      `json:"errmsg"`
	Result  UserDetails `json:"result"`
}

type UserDetails struct {
	Unionid       string  `json:"unionid"`
	Userid        string  `json:"userid"`
	Name          string  `json:"name"`
	Avatar        string  `json:"avatar"`
	Mobile        string  `json:"mobile"`
	Email         string  `json:"email"`
	Title         string  `json:"title"`
	Active        bool    `json:"active"`
	Admin         bool    `json:"admin"`
	Boss          bool    `json:"boss"`
	DeptIDList    []int64 `json:"dept_id_list"`
	JobNumber     string  `json:"job_number"`
	HiredDate     int64   `json:"hired_date"`
	ManagerUserid string  `json:"manager_userid"`
}

// 使用原始的http请求来获取用户的信息 - > 需要设置获取用户的权限功能：企业员工手机号信息和邮箱等个人信息、成员信息读权限
func (c *DingTalkClient) GetUserInfo(userID string) (*UserDetailResponse, error) {
	accessToken, err := c.GetAccessToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get access token while creating and delivering card: %w", err)
	}
	// 1. 构建URL和请求体
	url := "https://oapi.dingtalk.com/topapi/v2/user/get"
	payload := map[string]string{"userid": userID, "language": "zh_CN"} // 默认是中文
	jsonPayload, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	req.Header.Set("Content-Type", "application/json")
	query := req.URL.Query()
	query.Add("access_token", accessToken)
	req.URL.RawQuery = query.Encode()

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.logger.Error("Failed to get user info from dingtalk: %v", log.Error(err))
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	// 获取到用户信息
	c.logger.Info("Get user info from dingtalk success", log.Any("resp 原始的消息：", resp))

	var result UserDetailResponse
	if err := json.Unmarshal(body, &result); err != nil {
		c.logger.Error("Failed to unmarshal user info response: %v", log.Error(err))
		return nil, err
	}

	if result.ErrCode != 0 {
		c.logger.Error("Failed to get result info", log.Any("ErrCode", result.ErrCode), log.String("ErrMsg", result.ErrMsg))
		return nil, fmt.Errorf("result.ErrCode:%d", result.ErrCode)
	}
	// success
	c.logger.Info("Get user info from dingtalk success", log.Any("userinfo:", result))

	return &result, nil
}
