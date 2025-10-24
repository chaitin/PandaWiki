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
	ConfluenceListPath   = "/api/docs/confluence/list"
	ConfluenceExportPath = "/api/docs/confluence/export"
)

// ConfluenceListDocsRequest Confluence 获取文档列表请求
type ConfluenceListDocsRequest struct {
	URL      string `json:"url"`      // Confluence 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// ConfluenceExportDocRequest Confluence 导出文档请求
type ConfluenceExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // confluence-doc-id
}

// ConfluenceExportDocResponse Confluence 导出文档响应
type ConfluenceExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// ConfluenceExportDocData Confluence 导出文档数据
type ConfluenceExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// ConfluenceListDocs 获取 Confluence 文档列表
func (c *Client) ConfluenceListDocs(ctx context.Context, confluenceURL, filename, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = ConfluenceListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"url":      confluenceURL,
		"filename": filename,
		"uuid":     uuid,
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

	c.logger.Info("ConfluenceListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var confluenceResp ListDocResponse
	err = json.Unmarshal(respBody, &confluenceResp)
	if err != nil {
		return nil, err
	}

	if !confluenceResp.Success {
		return nil, errors.New(confluenceResp.Msg)
	}

	return &confluenceResp, nil
}

// ConfluenceExportDoc 导出 Confluence 文档
func (c *Client) ConfluenceExportDoc(ctx context.Context, uuid, docID, kbId string) (*ConfluenceExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = ConfluenceExportPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"uuid":   uuid,
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

	c.logger.Info("ConfluenceExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp ConfluenceExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
