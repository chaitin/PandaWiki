package nats

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq/types"
)

const (
	consumerAckWait = 5 * time.Minute
	// 回调是单协程串行处理，只允许预取一条，避免排队消息尚未开始处理就超过 AckWait。
	consumerMaxAckPending  = 1
	consumerMaxDeliver     = 5
	consumerHandlerTimeout = 10 * time.Minute
	consumerNakRetryDelay  = time.Minute

	defaultAckWait = 30 * time.Second
)

type consumerPolicy struct {
	ackWait       time.Duration
	maxAckPending int
	maxDeliver    int
}

// jetStreamPolicies 只为包含模型调用、单条处理很慢的主题收紧 ACK 参数。
// 其它主题（例如 raglite 文档状态回调）处理很快，且事件丢了不会自动补发，
// 因此保持服务端原有配置，避免 MaxDeliver 限制导致状态永久停在 RUNNING。
var jetStreamPolicies = map[string]consumerPolicy{
	domain.VectorTaskTopic: {
		ackWait:       consumerAckWait,
		maxAckPending: consumerMaxAckPending,
		maxDeliver:    consumerMaxDeliver,
	},
}

func jetStreamPolicy(topic string) (consumerPolicy, bool) {
	policy, ok := jetStreamPolicies[topic]
	return policy, ok
}

type MQConsumer struct {
	conn     *nats.Conn
	js       nats.JetStreamContext
	handlers map[string]*nats.Subscription
	mutex    sync.Mutex
	logger   *log.Logger
}

func NewMQConsumer(logger *log.Logger, config *config.Config) (*MQConsumer, error) {
	opts := []nats.Option{
		nats.Name("panda-wiki"),
	}

	// if user and password are configured, add authentication
	if user := config.MQ.NATS.User; user != "" {
		opts = append(opts, nats.UserInfo(user, config.MQ.NATS.Password))
	}

	// connect to nats server
	conn, err := nats.Connect(config.MQ.NATS.Server, opts...)
	if err != nil {
		return nil, err
	}

	// get jetstream context
	js, err := conn.JetStream()
	if err != nil {
		conn.Close()
		return nil, err
	}

	return &MQConsumer{
		conn:     conn,
		js:       js,
		handlers: make(map[string]*nats.Subscription),
		logger:   logger.WithModule("mq.nats"),
	}, nil
}

func (c *MQConsumer) RegisterHandler(topic string, handler func(ctx context.Context, msg types.Message) error) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.logger.Info("registering handler for topic", log.String("topic", topic))

	// 对于 anydoc.persistence.doc.task.export 主题，使用 Core NATS 订阅
	if topic == domain.AnydocTaskExportTopic {
		return c.registerCoreNATSHandler(topic, handler)
	}

	return c.registerJetStreamHandler(topic, handler)
}

// registerCoreNATSHandler 使用 Core NATS 订阅主题
func (c *MQConsumer) registerCoreNATSHandler(topic string, handler func(ctx context.Context, msg types.Message) error) error {
	sub, err := c.conn.Subscribe(topic, func(msg *nats.Msg) {
		c.logger.Debug("received message via Core NATS",
			log.String("topic", topic),
			log.Int("data_size", len(msg.Data)))

		if err := handler(context.Background(), &Message{msg: msg}); err != nil {
			c.logger.Error("handle message failed",
				log.String("topic", topic),
				log.Error(err))
			return
		}

	})
	if err != nil {
		c.logger.Error("failed to subscribe to topic via Core NATS",
			log.String("topic", topic),
			log.Error(err))
		return err
	}

	c.logger.Info("successfully subscribed to topic via Core NATS", log.String("topic", topic))
	c.handlers[topic] = sub
	return nil
}

// registerJetStreamHandler 使用 JetStream 订阅主题
func (c *MQConsumer) registerJetStreamHandler(topic string, handler func(ctx context.Context, msg types.Message) error) error {
	consumerName := domain.TopicConsumerName[topic]

	// Choose deliver policy based on topic
	var deliverPolicy nats.SubOpt
	if topic == domain.VectorTaskTopic {
		deliverPolicy = nats.DeliverNew()
	} else {
		deliverPolicy = nats.DeliverAll()
	}

	if err := c.updateJetStreamConsumer(topic, consumerName); err != nil {
		c.logger.Error("failed to update jetstream consumer config",
			log.String("topic", topic),
			log.String("consumer", consumerName),
			log.Error(err))
		return err
	}

	ackWait := defaultAckWait
	subOpts := []nats.SubOpt{
		deliverPolicy,
		nats.AckExplicit(),
		nats.ManualAck(),
		nats.Durable(consumerName),
		nats.ConsumerName(consumerName),
	}
	if policy, ok := jetStreamPolicy(topic); ok {
		ackWait = policy.ackWait
		subOpts = append(subOpts,
			nats.AckWait(policy.ackWait),
			nats.MaxAckPending(policy.maxAckPending),
			nats.MaxDeliver(policy.maxDeliver),
		)
	}

	sub, err := c.js.Subscribe(topic, func(msg *nats.Msg) {
		c.logger.Debug("received message via JetStream",
			log.String("topic", topic),
			log.Int("data_size", len(msg.Data)))

		ackDone := make(chan struct{})
		go func() {
			ticker := time.NewTicker(ackWait / 2)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					if err := msg.InProgress(); err != nil {
						c.logger.Warn("failed to extend jetstream ack deadline",
							log.String("topic", topic),
							log.Error(err))
					}
				case <-ackDone:
					return
				}
			}
		}()

		ctx, cancel := context.WithTimeout(context.Background(), consumerHandlerTimeout)
		defer cancel()
		err := handler(ctx, &Message{msg: msg})
		close(ackDone)
		if err != nil {
			c.logger.Error("handle message failed",
				log.String("topic", topic),
				log.Error(err))
			if nakErr := msg.NakWithDelay(consumerNakRetryDelay); nakErr != nil {
				c.logger.Error("failed to nack message",
					log.String("topic", topic),
					log.Error(nakErr))
			}
			return
		}

		if err := msg.Ack(); err != nil {
			c.logger.Error("failed to ack message",
				log.String("topic", topic),
				log.Error(err))
		}
	}, subOpts...)
	if err != nil {
		c.logger.Error("failed to subscribe to topic via JetStream",
			log.String("topic", topic),
			log.Error(err))
		return err
	}

	c.logger.Info("successfully subscribed to topic via JetStream", log.String("topic", topic))
	c.handlers[topic] = sub
	return nil
}

// updateJetStreamConsumer 更新已存在的 durable consumer 配置。
// nats.Subscribe 不会自动修改已存在 consumer 的 ACK 参数，升级后必须显式更新，否则旧配置会继续生效。
func (c *MQConsumer) updateJetStreamConsumer(topic, consumerName string) error {
	policy, ok := jetStreamPolicy(topic)
	if !ok {
		return nil
	}

	streamName, err := c.js.StreamNameBySubject(topic)
	if err != nil {
		return fmt.Errorf("get stream by subject %s failed: %w", topic, err)
	}
	info, err := c.js.ConsumerInfo(streamName, consumerName)
	if err != nil {
		if errors.Is(err, nats.ErrConsumerNotFound) {
			return nil
		}
		return fmt.Errorf("get consumer %s failed: %w", consumerName, err)
	}

	cfg := info.Config
	cfg.AckPolicy = nats.AckExplicitPolicy
	cfg.AckWait = policy.ackWait
	cfg.MaxAckPending = policy.maxAckPending
	cfg.MaxDeliver = policy.maxDeliver
	if _, err := c.js.UpdateConsumer(streamName, &cfg); err != nil {
		return fmt.Errorf("update consumer %s failed: %w", consumerName, err)
	}
	return nil
}

func (c *MQConsumer) StartConsumerHandlers(ctx context.Context) error {
	<-ctx.Done()
	return nil
}

func (c *MQConsumer) Close() error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	// close all subscriptions
	for _, sub := range c.handlers {
		if err := sub.Unsubscribe(); err != nil {
			c.logger.Error("unsubscribe failed", log.Any("error", err))
		}
	}

	// close connection
	c.conn.Close()
	return nil
}
