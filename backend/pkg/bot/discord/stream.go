package discord

import (
	"context"
	"fmt"
	"strings"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/pkg/bot"

	"github.com/bwmarrin/discordgo"
)

type DiscordClient struct {
	logger   *log.Logger
	BotToken string
	dg       *discordgo.Session
	getQA    bot.GetQAFun
}

func NewDiscordClient(logger *log.Logger, BotToken string, getQA bot.GetQAFun) (*DiscordClient, error) {
	dg, err := discordgo.New("Bot " + BotToken)
	if err != nil {
		return nil, fmt.Errorf("failed to create Discord session: %v", err)
	}
	return &DiscordClient{
		logger:   logger.WithModule("bot.discord"),
		BotToken: BotToken,
		dg:       dg,
		getQA:    getQA,
	}, nil
}

func (d *DiscordClient) Start() error {
	err := d.dg.Open()
	if err != nil {
		return fmt.Errorf("failed to open Discord connection: %v", err)
	}
	d.dg.AddHandler(d.handleMessage)
	return nil
}

func (d *DiscordClient) Stop() error {
	return d.dg.Close()
}

func (d *DiscordClient) handleMessage(s *discordgo.Session, m *discordgo.MessageCreate) {
	if m.Author.ID == s.State.User.ID {
		return
	}
	// 判断群聊单聊
	d.logger.Debug("接收到消息", log.String("消息内容", m.Content))
	d.logger.Debug("接收到消息", log.String("ChannelID", m.ChannelID))
	d.logger.Debug("接收到消息", log.String("GuildID", m.GuildID))
	// 只接收@ bot 的消息
	preFix := fmt.Sprintf("<@%s>", s.State.User.ID)
	if !strings.HasPrefix(m.Content, preFix) {
		return
	}
	content := strings.TrimPrefix(m.Content, preFix)
	info := domain.ConversationInfo{
		UserInfo: domain.UserInfo{
			NickName: m.Author.Username,
			Email:    m.Author.Email,
			UserID:   m.Author.ID,
		},
	}
	if m.GuildID != "" {
		info.UserInfo.From = domain.MessageFromGroup
	} else {
		info.UserInfo.From = domain.MessageFromPrivate
	}

	d.logger.Debug("消息来自", log.String("用户名", m.Author.Username), log.String("ID", m.Author.ID), log.String("内容", content))
	d.logger.Debug("消息来自频道", log.String("名称", m.ChannelID))
	qaChan, err := d.getQA(context.Background(), content, info, "")
	if err != nil {
		d.logger.Error("failed to get QA", log.String("error", err.Error()))
		return
	}

	message, err := s.ChannelMessageSend(m.ChannelID, "正在获取答案...")
	if err != nil {
		d.logger.Error("failed to send message to discord", log.String("error", err.Error()))
		return
	}
	go func() {
		buf := strings.Builder{}
		for qa := range qaChan {
			buf.WriteString(qa)
		}
		_, err := s.ChannelMessageEdit(message.ChannelID, message.ID, buf.String())
		if err != nil {
			d.logger.Error("failed to edit message to discord", log.String("error", err.Error()))
		}
	}()
}
