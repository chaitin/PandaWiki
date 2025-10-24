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
	siyuanListPath   = "/api/docs/siyuan/list"
	siyuanExportPath = "/api/docs/siyuan/export"
)

// SiyuanListDocsRequest Siyuan 获取文档列表请求
type SiyuanListDocsRequest struct {
	URL      string `json:"url"`      // Siyuan 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// SiyuanListDocsResponse Siyuan 获取文档列表响应
type SiyuanListDocsResponse struct {
	Success bool               `json:"success"`
	Msg     string             `json:"msg"`
	Data    SiyuanListDocsData `json:"data"`
}

// SiyuanListDocsData Siyuan 文档列表数据
type SiyuanListDocsData struct {
	Docs []SiyuanDoc `json:"docs"`
}

// SiyuanDoc Siyuan 文档信息
type SiyuanDoc struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// SiyuanExportDocRequest Siyuan 导出文档请求
type SiyuanExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // siyuan-doc-id
}

// SiyuanExportDocResponse Siyuan 导出文档响应
type SiyuanExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// SiyuanExportDocData Siyuan 导出文档数据
type SiyuanExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// SiyuanListDocs 获取 Siyuan 文档列表
func (c *Client) SiyuanListDocs(ctx context.Context, siyuanURL, filename, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = siyuanListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"url":      siyuanURL,
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

	c.logger.Info("SiyuanListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var siyuanResp ListDocResponse
	err = json.Unmarshal(respBody, &siyuanResp)
	if err != nil {
		return nil, err
	}

	if !siyuanResp.Success {
		return nil, errors.New(siyuanResp.Msg)
	}

	return &siyuanResp, nil
}

// SiyuanExportDoc 导出 Siyuan 文档
func (c *Client) SiyuanExportDoc(ctx context.Context, uuid, docID, kbId string) (*SiyuanExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = siyuanExportPath
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

	c.logger.Info("SiyuanExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp SiyuanExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
