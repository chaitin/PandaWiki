package feishu

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	lark "github.com/larksuite/oapi-sdk-go/v3"
	"github.com/larksuite/oapi-sdk-go/v3/event/dispatcher"
	larkcardkit "github.com/larksuite/oapi-sdk-go/v3/service/cardkit/v1"
	larkcontact "github.com/larksuite/oapi-sdk-go/v3/service/contact/v3"
	larkim "github.com/larksuite/oapi-sdk-go/v3/service/im/v1"
	larkws "github.com/larksuite/oapi-sdk-go/v3/ws"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type FeishuBotLogger struct {
	logger *log.Logger
}

func (l *FeishuBotLogger) Info(ctx context.Context, args ...interface{}) {
	l.logger.Info("feishu bot", log.Any("args", args))
}

func (l *FeishuBotLogger) Error(ctx context.Context, args ...interface{}) {
	l.logger.Error("feishu bot", log.Any("args", args))
}

func (l *FeishuBotLogger) Debug(ctx context.Context, args ...interface{}) {
	l.logger.Debug("feishu bot", log.Any("args", args))
}

func (l *FeishuBotLogger) Warn(ctx context.Context, args ...interface{}) {
	l.logger.Warn("feishu bot", log.Any("args", args))
}

type FeishuClient struct {
	ctx          context.Context
	cancel       context.CancelFunc
	clientID     string
	clientSecret string
	logger       *log.Logger
	client       *lark.Client
	msgMap       sync.Map
	getQA        bot.GetQAFun
	kbRepo       *pg.KnowledgeBaseRepository
	KbId         string
}

func NewFeishuClient(ctx context.Context, cancel context.CancelFunc, clientID, clientSecret string, logger *log.Logger,
	getQA bot.GetQAFun, kbRepo *pg.KnowledgeBaseRepository, kbId string) *FeishuClient {
	client := lark.NewClient(clientID, clientSecret, lark.WithLogger(&FeishuBotLogger{logger: logger}))

	c := &FeishuClient{
		ctx:          ctx,
		cancel:       cancel,
		clientID:     clientID,
		clientSecret: clientSecret,
		client:       client,
		logger:       logger,
		getQA:        getQA,
		kbRepo:       kbRepo,
		KbId:         kbId,
	}
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-c.ctx.Done():
				return
			case <-ticker.C:
				c.msgMap.Range(func(key, value any) bool {
					// remove messageId if it is older than 5 minutes
					if time.Now().Unix()-value.(int64) > 5*60 {
						c.msgMap.Delete(key)
					}
					return true
				})
			}
		}
	}()
	return c
}

var feedback = "\n\n---  \n\n此回答结果对您有帮助吗?  \n[👍 满意](%s) | [👎 不满意](%s)"
var likeUrl = "%s/feedback?score=1&message_id=%s"
var dislikeUrl = "%s/feedback?score=-1&message_id=%s"

var cardDataTemplate = `{"schema":"2.0","header":{"title":{"content":"%s","tag":"plain_text"}},"config":{"streaming_mode":true,"summary":{"content":""}},"body":{"elements":[{"tag":"markdown","content":"%s","element_id":"markdown_1"}]}}`

func (c *FeishuClient) sendQACard(ctx context.Context, receiveIdType string, receiveId string, question string, additionalInfo string) {
	// create card
	cardData := fmt.Sprintf(cardDataTemplate, question, "稍等，让我想一想...")
	req := larkcardkit.NewCreateCardReqBuilder().
		Body(larkcardkit.NewCreateCardReqBodyBuilder().
			Type(`card_json`).
			Data(cardData).
			Build()).
		Build()
	resp, err := c.client.Cardkit.V1.Card.Create(ctx, req)
	if err != nil {
		c.logger.Error("failed to create card", log.Error(err))
		return
	}
	if !resp.Success() {
		c.logger.Error("failed to create card", log.String("request_id", resp.RequestId()), log.Any("code_error", resp.CodeError))
		return
	}
	content, err := json.Marshal(map[string]any{
		"type": "card",
		"data": map[string]string{
			"card_id": *resp.Data.CardId,
		},
	})
	if err != nil {
		c.logger.Error("failed to marshal alarm card", log.Error(err))
		return
	}
	// send card to user or group
	res, err := c.client.Im.Message.Create(ctx, larkim.NewCreateMessageReqBuilder().
		ReceiveIdType(receiveIdType).
		Body(larkim.NewCreateMessageReqBodyBuilder().
			MsgType("interactive").
			ReceiveId(receiveId).
			Content(string(content)).
			Build()).
		Build())
	if err != nil {
		c.logger.Error("failed to create message", log.Error(err))
		return
	}
	if !res.Success() {
		c.logger.Error("failed to create message", log.Int("code", res.Code), log.String("msg", res.Msg), log.String("request_id", res.RequestId()))
		return
	}
	// 打印日志
	c.logger.Info("send QA card to user or group", log.String("receive_id_type", receiveIdType), log.String("receive_id", receiveId), log.String("question", question), log.String("additional_info(chat:user_openid/p2p:chat_id)", additionalInfo))

	// start processing QA
	convInfo := domain.ConversationInfo{
		UserInfo: domain.UserInfo{
			From: domain.MessageFromPrivate, // 默认是私聊
		},
	}
	if receiveIdType == "open_id" {
		// 获取用户的信息，只需要获取p2p的对话的类型的用户信息 - p2p对话
		userinfo, err := c.GetUserInfo(receiveId)
		if err != nil {
			c.logger.Error("get user info failed", log.Error(err))
		} else {
			if userinfo.UserId != nil {
				convInfo.UserInfo.UserID = *userinfo.UserId
			}
			if userinfo.Name != nil {
				convInfo.UserInfo.NickName = *userinfo.Name
			}
			if userinfo.Avatar != nil && userinfo.Avatar.AvatarOrigin != nil {
				convInfo.UserInfo.Avatar = *userinfo.Avatar.AvatarOrigin
			}
			c.logger.Info("get user info success", log.Any("user_info", userinfo))
		}
		convInfo.UserInfo.From = domain.MessageFromPrivate // 私聊
	} else { // chat_id 中的userid
		// 获取群聊的消息，用户如果是在群聊中@机器人，那么就获取的是群聊的消息
		userinfo, err := c.GetUserInfo(additionalInfo)
		if err != nil {
			c.logger.Error("get chat info failed", log.Error(err))
		} else {
			if userinfo.UserId != nil {
				convInfo.UserInfo.UserID = *userinfo.UserId
			}
			if userinfo.Name != nil {
				convInfo.UserInfo.NickName = *userinfo.Name
			}
			if userinfo.Avatar != nil && userinfo.Avatar.AvatarOrigin != nil {
				convInfo.UserInfo.Avatar = *userinfo.Avatar.AvatarOrigin
			}
			c.logger.Info("get chat user info success", log.Any("user_info", userinfo))
		}
		convInfo.UserInfo.From = domain.MessageFromGroup // 群聊
	}

	answerCh, messageId, err := c.getQA(ctx, question, convInfo, "")

	if err != nil {
		c.logger.Error("get QA failed", log.Error(err))
		return
	}

	answer := ""
	seq := 1
	for chunk := range answerCh {
		seq += 1
		answer += chunk
		// update card content streaming
		updateReq := larkcardkit.NewContentCardElementReqBuilder().
			CardId(*resp.Data.CardId).
			ElementId(`markdown_1`).
			Body(larkcardkit.NewContentCardElementReqBodyBuilder().
				Uuid(uuid.New().String()).
				Content(answer).
				Sequence(seq).
				Build()).
			Build()
		updateResp, err := c.client.Cardkit.V1.CardElement.Content(ctx, updateReq)
		if err != nil {
			c.logger.Error("failed to update card", log.Error(err))
			return
		}
		if !updateResp.Success() {
			c.logger.Error("failed to update card", log.String("request_id", updateResp.RequestId()), log.Any("code_error", updateResp.CodeError))
			return
		}
	}
	// 查询数据库
	kb, err := c.kbRepo.GetKnowledgeBaseByID(ctx, c.KbId)
	if err != nil {
		c.logger.Error("feishu GetKnowledgeBaseByID failed", log.Error(err))
	}
	// contact
	like := fmt.Sprintf(likeUrl, kb.AccessSettings.BaseURL, *messageId)
	dislike := fmt.Sprintf(dislikeUrl, kb.AccessSettings.BaseURL, *messageId)
	feedback_data := fmt.Sprintf(feedback, like, dislike)
	c.logger.Info("feedback_data", log.String("feedback_data", feedback_data))

	seq += 1
	answer += feedback_data
	// 最后在回复的最后加上用户反馈的链接，就是投票结果
	updateReq := larkcardkit.NewContentCardElementReqBuilder().
		CardId(*resp.Data.CardId).
		ElementId(`markdown_1`).
		Body(larkcardkit.NewContentCardElementReqBodyBuilder().
			Uuid(uuid.New().String()).
			Content(answer).
			Sequence(seq).
			Build()).
		Build()
	updateResp, err := c.client.Cardkit.V1.CardElement.Content(ctx, updateReq)
	if err != nil {
		c.logger.Error("failed to update card feedbackinfo", log.Error(err))
		return
	}
	if !updateResp.Success() {
		c.logger.Error("failed to update card", log.String("request_id", updateResp.RequestId()), log.Any("code_error", updateResp.CodeError))
		return
	}
	c.logger.Info("start processing QA feedbackinfo", log.String("message_id", *res.Data.MessageId))
}

type Message struct {
	Text string `json:"text"`
}

func (c *FeishuClient) Start() error {
	eventHandler := dispatcher.NewEventDispatcher("", "").
		OnP2MessageReceiveV1(func(ctx context.Context, event *larkim.P2MessageReceiveV1) error {
			// ignore duplicate message
			if *event.Event.Message.MessageId == "" {
				return nil
			}
			messageId := *event.Event.Message.MessageId
			if _, ok := c.msgMap.Load(messageId); ok {
				return nil
			}
			c.msgMap.Store(messageId, time.Now().Unix())
			c.logger.Info("received message from feishu bot", log.String("message_id", messageId))
			// only handle text type
			if *event.Event.Message.MessageType != "text" {
				return nil
			}
			switch *event.Event.Message.ChatType {
			case "group":
				var message Message
				if err := json.Unmarshal([]byte(*event.Event.Message.Content), &message); err != nil {
					c.logger.Error("failed to unmarshal message", log.Error(err))
					return nil
				}
				c.sendQACard(ctx, "chat_id", *event.Event.Message.ChatId, message.Text, *event.Event.Sender.SenderId.OpenId)
			case "p2p":
				var message Message
				if err := json.Unmarshal([]byte(*event.Event.Message.Content), &message); err != nil {
					c.logger.Error("failed to unmarshal message", log.Error(err))
					return nil
				}
				c.sendQACard(ctx, "open_id", *event.Event.Sender.SenderId.OpenId, message.Text, *event.Event.Message.ChatId)
			default:
				c.logger.Warn("unsupported chat type", log.String("chat_type", *event.Event.Message.ChatType))
			}
			return nil
		})

	cli := larkws.NewClient(c.clientID, c.clientSecret,
		larkws.WithEventHandler(eventHandler),
		larkws.WithLogger(&FeishuBotLogger{logger: c.logger}),
	)
	// FIXME: goroutine leak in larkws.Start
	err := cli.Start(c.ctx)
	if err != nil {
		return fmt.Errorf("failed to start feishu client: %w", err)
	}
	return nil
}

// 下面功能都是需要开启飞书对应的权限才可以获取到用户信息 -- 应用权限(否则获取不到对话用户的信息)

// 飞书机器人获取用户信息，只是适用于单个用户
func (c *FeishuClient) GetUserInfo(UserOpenId string) (*larkcontact.User, error) {
	// 获取用户信息，根据用户的id
	req := larkcontact.NewGetUserReqBuilder().UserId(UserOpenId).
		UserIdType(`open_id`).DepartmentIdType(`open_department_id`).Build()
	// 发起请求，获取用户消息
	resp, err := c.client.Contact.User.Get(context.Background(), req)
	if err != nil {
		c.logger.Error("failed to get user info", log.Error(err))
		return nil, err
	}

	// 失败
	if !resp.Success() {
		c.logger.Error("failed to get user info, response status not success", log.Any("errcode:", resp.Code))
		return nil, fmt.Errorf("failed to get user info, response data not success")
	}

	return resp.Data.User, nil
}

func (c *FeishuClient) Stop() {
	c.cancel()
}
