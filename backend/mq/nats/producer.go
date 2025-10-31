package nats

import (
	"context"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/log"
)

type MQProducer struct {
	conn   *nats.Conn
	js     nats.JetStreamContext
	logger *log.Logger
}

func (p *MQProducer) EnsureStreams() error {
	streams := []struct {
		name     string
		subjects []string
	}{
		{
			name:     "task",
			subjects: []string{"apps.panda-wiki.summary.task", "apps.panda-wiki.vector.task", "rag.doc.update"},
		},
		{
			name:     "scraper",
			subjects: []string{"apps.panda-wiki.scraper.>"},
		},
	}

	for _, stream := range streams {
		streamConfig := &nats.StreamConfig{
			Name:       stream.name,
			Subjects:   stream.subjects,
			Storage:    nats.FileStorage,
			Retention:  nats.LimitsPolicy,
			Discard:    nats.DiscardOld,
			MaxAge:     7 * 24 * time.Hour,
			MaxBytes:   1 * 1024 * 1024 * 1024,
			MaxMsgs:    1000000,
			MaxMsgSize: 50 * 1024 * 1024,
			Replicas:   1,
			Duplicates: 120 * time.Second,
		}

		// Check if stream already exists
		_, err := p.js.StreamInfo(stream.name)
		if err == nil {
			// Stream exists, update it to add new subjects if needed
			p.logger.Debug("stream already exists, updating",
				log.String("stream", stream.name))
			_, err = p.js.UpdateStream(streamConfig)
			if err != nil {
				p.logger.Warn("failed to update stream",
					log.String("stream", stream.name),
					log.Error(err))
			} else {
				p.logger.Info("updated stream",
					log.String("stream", stream.name),
					log.Any("subjects", stream.subjects))
			}
			continue
		}

		// Stream doesn't exist, create it
		_, err = p.js.AddStream(streamConfig)
		if err != nil {
			return fmt.Errorf("failed to create stream %s: %w", stream.name, err)
		}

		p.logger.Info("created stream",
			log.String("stream", stream.name),
			log.Any("subjects", stream.subjects))
	}

	return nil
}

func NewMQProducer(config *config.Config, logger *log.Logger) (*MQProducer, error) {
	opts := []nats.Option{
		nats.Name("panda-wiki"),
	}

	if user := config.MQ.NATS.User; user != "" {
		opts = append(opts, nats.UserInfo(user, config.MQ.NATS.Password))
	}

	server := config.MQ.NATS.Server

	conn, err := nats.Connect(server, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	js, err := conn.JetStream()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to get JetStream context: %w", err)
	}

	producer := &MQProducer{
		conn:   conn,
		js:     js,
		logger: logger,
	}

	// Ensure streams exist
	if err := producer.EnsureStreams(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to ensure streams: %w", err)
	}

	return producer, nil
}

func (p *MQProducer) Produce(ctx context.Context, topic string, key string, value []byte) error {
	p.logger.Debug("publishing message",
		log.String("topic", topic),
		log.String("key", key),
		log.Int("value_size", len(value)))

	_, err := p.js.Publish(topic, value)
	if err != nil {
		p.logger.Error("failed to publish message",
			log.String("topic", topic),
			log.Error(err))
		return fmt.Errorf("failed to publish message: %w", err)
	}

	p.logger.Debug("message published successfully",
		log.String("topic", topic))
	return nil
}

func (p *MQProducer) Close() error {
	p.conn.Close()
	return nil
}
