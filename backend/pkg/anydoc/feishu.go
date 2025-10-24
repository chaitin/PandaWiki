package anydoc

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

const (
	feishuListPath   = "/api/docs/feishu/list"
	feishuExportPath = "/api/docs/feishu/export"
)

// FeishuListDocsRequest Feishu 获取文档列表请求
type FeishuListDocsRequest struct {
	URL      string `json:"url"`      // Feishu 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// FeishuListDocsResponse Feishu 获取文档列表响应
type FeishuListDocsResponse struct {
	Success bool               `json:"success"`
	Msg     string             `json:"msg"`
	Data    FeishuListDocsData `json:"data"`
}

// FeishuListDocsData Feishu 文档列表数据
type FeishuListDocsData struct {
	Docs []FeishuDoc `json:"docs"`
}

// FeishuDoc Feishu 文档信息
type FeishuDoc struct {
	ID       string `json:"id"`
	FileType string `json:"file_type"`
	Title    string `json:"title"`
	Summary  string `json:"summary"`
}

// FeishuExportDocRequest Feishu 导出文档请求
type FeishuExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // feishu-doc-id
}

// FeishuExportDocResponse Feishu 导出文档响应
type FeishuExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// FeishuExportDocData Feishu 导出文档数据
type FeishuExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// FeishuListDocs 获取 Feishu 文档列表
func (c *Client) FeishuListDocs(ctx context.Context, uuid, appId, appSecret, accessToken, spaceId string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = feishuListPath

	q := u.Query()
	q.Set("uuid", uuid)
	q.Set("app_id", appId)
	q.Set("app_secret", appSecret)
	q.Set("access_token", accessToken)
	if spaceId != "" {
		q.Set("space_id", spaceId)
	}
	u.RawQuery = q.Encode()
	requestURL := u.String()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
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

	c.logger.Info("FeishuListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var feishuResp ListDocResponse
	err = json.Unmarshal(respBody, &feishuResp)
	if err != nil {
		return nil, err
	}

	if !feishuResp.Success {
		return nil, errors.New(feishuResp.Msg)
	}

	return &feishuResp, nil
}

// FeishuExportDoc 导出 Feishu 文档
func (c *Client) FeishuExportDoc(ctx context.Context, uuid, docID, fileType, spaceId, kbId string) (*FeishuExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = feishuExportPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"uuid":      uuid,
		"doc_id":    docID,
		"file_type": fileType,
		"space_id":  spaceId,
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

	c.logger.Info("FeishuDoc", "requestURL:", requestURL, "body", string(jsonData), "resp", string(respBody))

	var exportResp FeishuExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
