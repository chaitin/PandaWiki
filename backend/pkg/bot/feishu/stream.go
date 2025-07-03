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
	larkim "github.com/larksuite/oapi-sdk-go/v3/service/im/v1"
	larkws "github.com/larksuite/oapi-sdk-go/v3/ws"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"
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
}

func NewFeishuClient(ctx context.Context, cancel context.CancelFunc, clientID, clientSecret string, logger *log.Logger, getQA bot.GetQAFun) *FeishuClient {
	client := lark.NewClient(clientID, clientSecret, lark.WithLogger(&FeishuBotLogger{logger: logger}))

	c := &FeishuClient{
		ctx:          ctx,
		cancel:       cancel,
		clientID:     clientID,
		clientSecret: clientSecret,
		client:       client,
		logger:       logger,
		getQA:        getQA,
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

var cardDataTemplate = `{"schema":"2.0","header":{"title":{"content":"%s","tag":"plain_text"}},"config":{"streaming_mode":true,"summary":{"content":""}},"body":{"elements":[{"tag":"markdown","content":"%s","element_id":"markdown_1"}]}}`

func (c *FeishuClient) sendQACard(ctx context.Context, receiveIdType string, receiveId string, question string) {
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

	answerCh, err := c.getQA(ctx, question, domain.ConversationInfo{}, "")
	if err != nil {
		c.logger.Error("feishu client failed to get answer", log.Error(err))
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
	c.logger.Info("start processing QA", log.String("message_id", *res.Data.MessageId))
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
			if *event.Event.Message.ChatType == "group" {
				var message Message
				if err := json.Unmarshal([]byte(*event.Event.Message.Content), &message); err != nil {
					c.logger.Error("failed to unmarshal message", log.Error(err))
					return nil
				}
				c.sendQACard(ctx, "chat_id", *event.Event.Message.ChatId, message.Text)
			} else if *event.Event.Message.ChatType == "p2p" {
				var message Message
				if err := json.Unmarshal([]byte(*event.Event.Message.Content), &message); err != nil {
					c.logger.Error("failed to unmarshal message", log.Error(err))
					return nil
				}
				c.sendQACard(ctx, "open_id", *event.Event.Sender.SenderId.OpenId, message.Text)
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

func (c *FeishuClient) Stop() {
	c.cancel()
}
