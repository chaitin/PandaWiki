package discord

import (
	"context"
	"testing"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

func TestDiscord(t *testing.T) {
	cfg, _ := config.NewConfig()
	log := log.NewLogger(cfg)
	token := "token"
	getQA := func(ctx context.Context, msg string, info domain.ConversationInfo, ConversationID string) (chan string, error) {
		contentCh := make(chan string, 10)
		go func() {
			defer close(contentCh)
			contentCh <- "hello " + msg
		}()
		return contentCh, nil
	}
	c, _ := NewDiscordClient(log, token, getQA)
	if err := c.Start(); err != nil {
		t.Errorf("Failed to start Discord client: %v", err)
	}

	select {}
}
