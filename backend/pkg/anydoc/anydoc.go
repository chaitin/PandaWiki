package anydoc

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/mq/types"
)

type Client struct {
	httpClient  *http.Client
	logger      *log.Logger
	mqConsumer  mq.MQConsumer
	taskWaiters map[string]chan *domain.AnydocTaskExportEvent
	mutex       sync.RWMutex
	subscribed  bool
	subscribeMu sync.Mutex
}

const (
	apiUploaderUrl     = "http://panda-wiki-api:8000/api/v1/file/upload/anydoc"
	uploaderDir        = "/image"
	crawlerServiceHost = "http://panda-wiki-crawler:8080"
	SpaceIdCloud       = "cloud_disk"
	getUrlPath         = "/api/docs/url/list"
	UrlExportPath      = "/api/docs/url/export"
	TaskListPath       = "/api/tasks/list"
)

type Status string

const (
	StatusPending    Status = "pending"
	StatusInProgress Status = "in_process"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
)

type UploaderType uint

const (
	uploaderTypeDefault UploaderType = iota
	uploaderTypeHTTP
)

func NewClient(logger *log.Logger, mqConsumer mq.MQConsumer) (*Client, error) {
	client := &Client{
		logger: logger.WithModule("anydoc.client"),
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
		},
		taskWaiters: make(map[string]chan *domain.AnydocTaskExportEvent),
		mqConsumer:  mqConsumer,
	}

	return client, nil
}

func (c *Client) GetUrlList(ctx context.Context, targetURL, id string) (*ListDocResponse, error) {

	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = getUrlPath
	q := u.Query()
	q.Set("url", targetURL)
	q.Set("uuid", id)
	u.RawQuery = q.Encode()
	requestURL := u.String()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	c.logger.Info("scrape url", "requestURL:", requestURL, "resp", string(respBody))
	var scrapeResp ListDocResponse
	err = json.Unmarshal(respBody, &scrapeResp)
	if err != nil {
		return nil, err
	}

	if !scrapeResp.Success {
		return nil, errors.New(scrapeResp.Msg)
	}

	return &scrapeResp, nil
}

func (c *Client) UrlExport(ctx context.Context, id, docID, kbId string) (*UrlExportRes, error) {

	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = UrlExportPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"uuid":   id,
		"doc_id": docID,
		"uploader": map[string]interface{}{
			"type": uploaderTypeHTTP,
			"http": map[string]interface{}{
				"url": apiUploaderUrl,
			},
			"dir": fmt.Sprintf("/%s", kbId),
		},
	}

	jsonData, err := json.Marshal(bodyMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	c.logger.Info("UrlExport", "requestURL:", requestURL, "resp", string(respBody))
	var res UrlExportRes
	err = json.Unmarshal(respBody, &res)
	if err != nil {
		return nil, err
	}

	if !res.Success {
		return nil, errors.New(res.Msg)
	}
	return &res, nil
}

// ensureSubscribed 确保已订阅消息队列，只订阅一次
func (c *Client) ensureSubscribed() error {
	c.subscribeMu.Lock()
	defer c.subscribeMu.Unlock()

	if c.subscribed {
		return nil
	}

	if c.mqConsumer == nil {
		return fmt.Errorf("MQ consumer not initialized")
	}

	err := c.mqConsumer.RegisterHandler(domain.AnydocTaskExportTopic, c.handleTaskExportEvent)
	if err != nil {
		return fmt.Errorf("failed to register task export handler: %w", err)
	}

	c.subscribed = true
	c.logger.Info("successfully subscribed to anydoc task export topic")
	return nil
}

// TaskWaitForCompletion 通过 NATS 消息队列等待任务完成（推荐方式）
func (c *Client) TaskWaitForCompletion(ctx context.Context, taskID string) (*domain.AnydocTaskExportEvent, error) {
	if c.mqConsumer == nil {
		return nil, fmt.Errorf("MQ consumer not initialized, use NewClientWithMQ instead")
	}

	// 延迟订阅：只有在需要时才订阅
	if err := c.ensureSubscribed(); err != nil {
		return nil, err
	}

	// Create a channel to wait for the specific task
	taskChan := make(chan *domain.AnydocTaskExportEvent, 1)

	c.mutex.Lock()
	c.taskWaiters[taskID] = taskChan
	c.mutex.Unlock()

	// Cleanup when done
	defer func() {
		c.mutex.Lock()
		delete(c.taskWaiters, taskID)
		c.mutex.Unlock()
		close(taskChan)
	}()

	// Wait for task completion or context cancellation
	select {
	case event := <-taskChan:
		return event, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// TaskListPoll 轮询方式（保留兼容性）
func (c *Client) TaskListPoll(ctx context.Context, ids []string) (*TaskRes, error) {
	depth := 0
	const maxDepth = 10

	for depth < maxDepth {
		time.Sleep(1000 * time.Millisecond)
		resp, err := c.TaskList(ctx, ids)
		if err != nil {
			return nil, err
		}
		if resp.Data[0].Status == StatusCompleted {
			return resp, nil
		}
		depth++
	}
	return nil, fmt.Errorf("task list poll timeout")
}

// handleTaskExportEvent 处理任务导出完成事件
func (c *Client) handleTaskExportEvent(ctx context.Context, msg types.Message) error {
	var event domain.AnydocTaskExportEvent
	if err := json.Unmarshal(msg.GetData(), &event); err != nil {
		c.logger.Error("failed to unmarshal task export event", "error", err)
		return err
	}

	c.logger.Info("received task export event",
		"task_id", event.TaskID,
		"status", event.Status,
		"doc_id", event.DocID)

	// Notify waiting goroutines
	c.mutex.RLock()
	if taskChan, exists := c.taskWaiters[event.TaskID]; exists {
		select {
		case taskChan <- &event:
		default:
			// Channel is full or closed, ignore
		}
	}
	c.mutex.RUnlock()

	return nil
}

func (c *Client) TaskList(ctx context.Context, ids []string) (*TaskRes, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = TaskListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"ids": ids,
	}
	jsonData, err := json.Marshal(bodyMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, requestURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	c.logger.Info("TaskList url", "requestURL", requestURL, "resp", string(respBody))
	var res TaskRes
	err = json.Unmarshal(respBody, &res)
	if err != nil {
		return nil, err
	}

	if !res.Success {
		return nil, errors.New(res.Msg)
	}
	if len(res.Data) == 0 {
		return nil, errors.New("data list is empty")
	}
	return &res, nil
}

func (c *Client) DownloadDoc(ctx context.Context, filepath string) ([]byte, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = "/api/tasks/download" + filepath
	requestURL := u.String()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	c.logger.Info("DownloadDoc", "requestURL:", requestURL, "resp length", len(respBody))
	return respBody, nil
}
