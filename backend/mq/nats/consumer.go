package nats

import (
	"context"
	"sync"

	"github.com/nats-io/nats.go"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq/types"
)

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

	sub, err := c.js.Subscribe(topic, func(msg *nats.Msg) {
		c.logger.Debug("received message via JetStream",
			log.String("topic", topic),
			log.Int("data_size", len(msg.Data)))

		if err := handler(context.Background(), &Message{msg: msg}); err != nil {
			c.logger.Error("handle message failed",
				log.String("topic", topic),
				log.Error(err))
			return
		}

		if err := msg.Ack(); err != nil {
			c.logger.Error("failed to ack message",
				log.String("topic", topic),
				log.Error(err))
		}
	}, nats.DeliverAll(), nats.AckExplicit(), nats.Durable(consumerName), nats.ConsumerName(consumerName))
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
