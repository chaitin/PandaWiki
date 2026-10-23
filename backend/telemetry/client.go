package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/usecase"
)

const (
	machineIDFile  = "/data/.machine_id"
	reportInterval = time.Hour
)

// Client is the telemetry client
type Client struct {
	baseURL          string
	httpClient       *http.Client
	machineID        string
	firstReport      bool
	stopChan         chan struct{}
	stopOnce         sync.Once
	logger           *log.Logger
	repo             *pg.KnowledgeBaseRepository
	modelUsecase     *usecase.ModelUsecase
	userUsecase      *usecase.UserUsecase
	nodeRepo         *pg.NodeRepository
	conversationRepo *pg.ConversationRepository
	mcpRepo          *pg.MCPRepository
	cfg              *config.Config
	aesKey           string
}

// NewClient creates a new telemetry client
func NewClient(logger *log.Logger, repo *pg.KnowledgeBaseRepository, modelUsecase *usecase.ModelUsecase, userUsecase *usecase.UserUsecase, nodeRepo *pg.NodeRepository, conversationRepo *pg.ConversationRepository, mcpRepo *pg.MCPRepository, cfg *config.Config) (*Client, error) {
	baseURL := "https://baizhi.cloud/api/public/data/report"
	aesKey := "SZ3SDP38y9Gg2c6yHdLPgDeX"

	client := &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		firstReport:      true,
		stopChan:         make(chan struct{}),
		logger:           logger.WithModule("telemetry"),
		repo:             repo,
		modelUsecase:     modelUsecase,
		userUsecase:      userUsecase,
		nodeRepo:         nodeRepo,
		conversationRepo: conversationRepo,
		mcpRepo:          mcpRepo,
		cfg:              cfg,
		aesKey:           aesKey,
	}

	if !cfg.Telemetry.Enabled {
		// Reporting is off, so there is no need for a machine ID on disk nor
		// for the periodic reporter goroutine.
		logger.Info("telemetry is disabled")
		return client, nil
	}

	// get or create machine ID
	machineID, err := client.getOrCreateMachineID()
	if err != nil {
		logger.Error("failed to get or create machine ID", log.Error(err))
		return nil, fmt.Errorf("failed to get or create machine ID: %w", err)
	}
	client.machineID = machineID

	// report immediately on startup
	if err := client.reportInstallation(); err != nil {
		logger.Error("initial report installation", log.Error(err))
	}

	// start periodic report
	go client.startPeriodicReport()

	return client, nil
}

func (c *Client) GetMachineID() string {
	return c.machineID
}

func (c *Client) getOrCreateMachineID() (string, error) {
	// get machine id from file
	if id, err := os.ReadFile(machineIDFile); err == nil {
		c.firstReport = false
		return strings.TrimSpace(string(id)), nil
	} else if !os.IsNotExist(err) {
		return "", fmt.Errorf("failed to read machine ID file: %w", err)
	}

	// ensure dir is exists
	dir := filepath.Dir(machineIDFile)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create machine ID directory: %w", err)
	}

	// create lock file to prevent concurrent access
	lockFile := machineIDFile + ".lock"
	lock, err := os.OpenFile(lockFile, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			// if lock file already exists, wait and try again
			c.logger.Info("lock file already exists, waiting and trying again")
			time.Sleep(100 * time.Millisecond)
			return c.getOrCreateMachineID()
		}
		return "", fmt.Errorf("failed to create lock file: %w", err)
	}
	defer func() {
		if err := lock.Close(); err != nil {
			c.logger.Error("failed to close lock file", log.Error(err))
		}
		if err := os.Remove(lockFile); err != nil {
			c.logger.Error("failed to remove lock file", log.Error(err))
		}
	}()

	if id, err := os.ReadFile(machineIDFile); err == nil {
		c.firstReport = false
		return strings.TrimSpace(string(id)), nil
	}

	// generate unique ID using UUID
	id := uuid.New().String()

	// write machine ID to file and ensure data is written to disk
	if err := os.WriteFile(machineIDFile, []byte(id), 0o644); err != nil {
		return "", fmt.Errorf("failed to write machine ID file: %w", err)
	}

	// sync file to ensure data is written to disk
	if file, err := os.OpenFile(machineIDFile, os.O_RDWR, 0o644); err == nil {
		if err := file.Sync(); err != nil {
			if err := file.Close(); err != nil {
				c.logger.Error("failed to close machine ID file after write", log.Error(err))
			}
			return "", fmt.Errorf("failed to sync machine ID file: %w", err)
		}
		if err := file.Close(); err != nil {
			c.logger.Error("failed to close machine ID file after sync", log.Error(err))
		}
	}
	return id, nil
}

// startPeriodicReport starts periodic report
func (c *Client) startPeriodicReport() {
	ticker := time.NewTicker(reportInterval)
	defer ticker.Stop()

	dataTimer := time.NewTimer(c.nextReportDataDelay())
	defer dataTimer.Stop()

	for {
		select {
		case <-ticker.C:
			if err := c.reportInstallation(); err != nil {
				c.logger.Error("periodic report installation", log.Error(err))
			}
		case <-dataTimer.C:
			if err := c.reportData(); err != nil {
				c.logger.Error("periodic report data", log.Error(err))
			}
			dataTimer.Reset(c.nextReportDataDelay())
		case <-c.stopChan:
			return
		}
	}
}

// 计算下一次数据上报的延迟，使其在每天 23:30:00–23:58:00 窗口内随机触发。
// 若当前时间位于当日窗口内，返回窗口剩余时间内的随机秒数；否则返回到最近窗口的随机偏移。
func (c *Client) nextReportDataDelay() time.Duration {
	now := time.Now()
	loc := now.Location()
	start := time.Date(now.Year(), now.Month(), now.Day(), 23, 30, 0, 0, loc)
	end := time.Date(now.Year(), now.Month(), now.Day(), 23, 58, 0, 0, loc)
	window := end.Sub(start)

	// 如果当前时间在窗口之前，安排在今日窗口的随机时间
	if now.Before(start) {
		sec := int(window / time.Second)
		// 防止 sec 为 0
		if sec <= 0 {
			sec = 1
		}
		offset := time.Duration(rand.Intn(sec)) * time.Second
		return time.Until(start.Add(offset))
	}

	// 如果当前时间在窗口内，返回窗口剩余时间内的随机秒数
	if !now.After(end) {
		remaining := end.Sub(now)
		sec := int(remaining / time.Second)
		if sec <= 0 {
			sec = 1
		}
		offset := rand.Intn(sec) + 1
		return time.Duration(offset) * time.Second
	}

	// 否则安排在次日窗口的随机时间
	nextStart := start.Add(24 * time.Hour)
	sec := int(window / time.Second)
	if sec <= 0 {
		sec = 1
	}
	offset := time.Duration(rand.Intn(sec)) * time.Second
	return time.Until(nextStart.Add(offset))
}

// reportInstallation reports installation information
func (c *Client) reportInstallation() error {
	event := InstallationEvent{
		Version:   Version,
		Timestamp: time.Now().Format(time.RFC3339),
		MachineID: c.machineID,
		Type:      "installation",
	}
	if !c.firstReport {
		event.Type = "heartbeat"
	}
	if repoList, err := c.repo.GetKnowledgeBaseList(context.Background()); err != nil {
		c.logger.Error("get knowledge base list failed in telemetry", log.Error(err))
	} else {
		event.KBCount = len(repoList)
	}

	eventRaw, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	eventEncrypted, err := Encrypt([]byte(c.aesKey), eventRaw)
	if err != nil {
		return fmt.Errorf("encrypt installation event: %w", err)
	}
	data := map[string]string{
		"index": "panda-wiki-installation",
		"data":  eventEncrypted,
		"id":    uuid.New().String(),
	}
	eventEncryptedRaw, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	req, err := http.NewRequest("POST", c.baseURL, bytes.NewBuffer(eventEncryptedRaw))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}
	c.firstReport = false

	return nil
}

func (c *Client) reportData() error {
	event := DailyReportEvent{
		InstallationEvent: InstallationEvent{
			Version:   Version,
			Timestamp: time.Now().Format(time.RFC3339),
			MachineID: c.machineID,
			Type:      "data_report",
		},
	}

	if repoList, err := c.repo.GetKnowledgeBaseList(context.Background()); err == nil {
		event.KBCount = len(repoList)
	} else {
		c.logger.Error("get knowledge base list failed in telemetry", log.Error(err))
	}

	if modelModeSetting, err := c.modelUsecase.GetModelModeSetting(context.Background()); err == nil {
		event.ModelConfigMode = string(modelModeSetting.Mode)
	} else {
		c.logger.Error("get model config mode failed in telemetry", log.Error(err))
	}

	if ok, err := c.isAdminLoggedInYesterday(); err == nil {
		event.AdminLoggedInToday = ok
	} else {
		c.logger.Error("get admin login today failed in telemetry", log.Error(err))
	}

	if count, err := c.nodeRepo.GetNodeCount(context.Background()); err == nil {
		event.DocsCount = count
	} else {
		c.logger.Error("get docs count failed in telemetry", log.Error(err))
	}

	// conversation counts by app type across all KBs
	if totals, err := c.conversationRepo.GetConversationCountByAppType(context.Background()); err == nil {
		event.WebConversationCount = int(totals[domain.AppTypeWeb])
		event.WidgetConversationCount = int(totals[domain.AppTypeWidget])
		event.DingTalkBotConversationCount = int(totals[domain.AppTypeDingTalkBot])
		event.FeishuBotConversationCount = int(totals[domain.AppTypeFeishuBot])
		event.WechatBotConversationCount = int(totals[domain.AppTypeWechatBot])
		event.WeChatServerBotConversationCount = int(totals[domain.AppTypeWechatServiceBot])
		event.DiscordBotConversationCount = int(totals[domain.AppTypeDisCordBot])
		event.WechatOfficialAccountConversationCount = int(totals[domain.AppTypeWechatOfficialAccount])
		event.OpenAIAPIConversationCount = int(totals[domain.AppTypeOpenAIAPI])
		event.WecomAIBotConversationCount = int(totals[domain.AppTypeWecomAIBot])
		event.LarkBotConversationCount = int(totals[domain.AppTypeLarkBot])
	} else {
		c.logger.Error("get conversation count by app type failed", log.Error(err))
	}

	if count, err := c.mcpRepo.GetMCPCallCount(context.Background()); err == nil {
		event.McpServerConversationCount = int(count)
	} else {
		c.logger.Error("get mcp call count failed", log.Error(err))
	}

	eventRaw, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	c.logger.Info("report data event", log.String("event", string(eventRaw)))
	eventEncrypted, err := Encrypt([]byte(c.aesKey), eventRaw)
	if err != nil {
		return fmt.Errorf("encrypt installation event: %w", err)
	}
	data := map[string]string{
		"index": "panda-wiki-installation",
		"data":  eventEncrypted,
		"id":    uuid.New().String(),
	}
	eventEncryptedRaw, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal installation event: %w", err)
	}
	req, err := http.NewRequest("POST", c.baseURL, bytes.NewBuffer(eventEncryptedRaw))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil
}

// 判断“昨日是否有管理员访问”。
// 因为数据在每天 0–1 点上报，这里采用昨日 0:00 至今日 0:00 的时间窗口。
func (c *Client) isAdminLoggedInYesterday() (bool, error) {
	resp, err := c.userUsecase.ListUsers(context.Background())
	if err != nil {
		return false, err
	}
	now := time.Now()
	loc := now.Location()
	todayMidnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	yesterdayMidnight := todayMidnight.Add(-24 * time.Hour)
	for _, u := range resp.Users {
		if u.Role == consts.UserRoleAdmin && u.LastAccess != nil && !u.LastAccess.Before(yesterdayMidnight) && u.LastAccess.Before(todayMidnight) {
			return true, nil
		}
	}
	return false, nil
}

// Stop stops periodic report. It is safe to call more than once.
func (c *Client) Stop() {
	c.stopOnce.Do(func() {
		close(c.stopChan)
	})
}

// InstallationEvent represents installation event
type InstallationEvent struct {
	Version   string `json:"version"`
	MachineID string `json:"machine_id"`
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`
	KBCount   int    `json:"kb_count"`
}

type DailyReportEvent struct {
	InstallationEvent
	ModelConfigMode                        string `json:"model_config_mode"`                          // 模型配置模式
	AdminLoggedInToday                     bool   `json:"admin_logged_in_today"`                      // 是否今日登录管理端
	DocsCount                              int    `json:"docs_count"`                                 // 文件数量
	WebConversationCount                   int    `json:"web_conversation_count"`                     // 网页对话次数
	WidgetConversationCount                int    `json:"widget_conversation_count"`                  // 插件对话次数
	DingTalkBotConversationCount           int    `json:"dingtalk_bot_conversation_count"`            // 钉钉机器人对话次数
	FeishuBotConversationCount             int    `json:"feishu_bot_conversation_count"`              // 飞书机器人对话次数
	WechatBotConversationCount             int    `json:"wechat_bot_conversation_count"`              // 企业微信机器人对话次数
	WeChatServerBotConversationCount       int    `json:"wechat_server_bot_conversation_count"`       // 企业微信客服对话次数
	DiscordBotConversationCount            int    `json:"discord_bot_conversation_count"`             // Discord 机器人对话次数
	WechatOfficialAccountConversationCount int    `json:"wechat_official_account_conversation_count"` // 微信公众号对话次数
	OpenAIAPIConversationCount             int    `json:"openai_api_conversation_count"`              // OpenAI API 调用次数
	WecomAIBotConversationCount            int    `json:"wecom_ai_bot_conversation_count"`            // 企业微信智能机器人对话次数
	LarkBotConversationCount               int    `json:"lark_bot_conversation_count"`                // 飞书机器人对话次数
	McpServerConversationCount             int    `json:"mcp_server_conversation_count"`              // MCP 对话次数
}
