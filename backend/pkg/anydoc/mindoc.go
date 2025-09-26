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
	mindocListPath   = "/api/docs/mindoc/list"
	mindocExportPath = "/api/docs/mindoc/export"
)

// MindocListDocsRequest Mindoc 获取文档列表请求
type MindocListDocsRequest struct {
	URL      string `json:"url"`      // Mindoc 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// MindocListDocsResponse Mindoc 获取文档列表响应
type MindocListDocsResponse struct {
	Success bool               `json:"success"`
	Msg     string             `json:"msg"`
	Data    MindocListDocsData `json:"data"`
}

// MindocListDocsData Mindoc 文档列表数据
type MindocListDocsData struct {
	Docs []MindocDoc `json:"docs"`
}

// MindocDoc Mindoc 文档信息
type MindocDoc struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// MindocExportDocRequest Mindoc 导出文档请求
type MindocExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // mindoc-doc-id
}

// MindocExportDocResponse Mindoc 导出文档响应
type MindocExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// MindocExportDocData Mindoc 导出文档数据
type MindocExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// MindocListDocs 获取 Mindoc 文档列表
func (c *Client) MindocListDocs(ctx context.Context, mindocURL, filename, uuid string) (*MindocListDocsResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = mindocListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"url":      mindocURL,
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

	c.logger.Info("MindocListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var mindocResp MindocListDocsResponse
	err = json.Unmarshal(respBody, &mindocResp)
	if err != nil {
		return nil, err
	}

	if !mindocResp.Success {
		return nil, errors.New(mindocResp.Msg)
	}

	return &mindocResp, nil
}

// MindocExportDoc 导出 Mindoc 文档
func (c *Client) MindocExportDoc(ctx context.Context, uuid, docID, kbId string) (*MindocExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = mindocExportPath
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

	c.logger.Info("MindocExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp MindocExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
