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
	notionListPath   = "/api/docs/notion/list"
	notionExportPath = "/api/docs/notion/export"
)

// NotionListDocsResponse Notion 获取文档列表响应
type NotionListDocsResponse struct {
	Success bool               `json:"success"`
	Msg     string             `json:"msg"`
	Data    NotionListDocsData `json:"data"`
}

// NotionListDocsData Notion 文档列表数据
type NotionListDocsData struct {
	Docs []NotionDoc `json:"docs"`
}

// NotionDoc Notion 文档信息
type NotionDoc struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// NotionExportDocResponse Notion 导出文档响应
type NotionExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// NotionListDocs 获取 Notion 文档列表
func (c *Client) NotionListDocs(ctx context.Context, secret, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = notionListPath

	q := u.Query()
	q.Set("uuid", uuid)
	q.Set("secret", secret)

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

	c.logger.Info("NotionListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var notionResp ListDocResponse
	err = json.Unmarshal(respBody, &notionResp)
	if err != nil {
		return nil, err
	}

	if !notionResp.Success {
		return nil, errors.New(notionResp.Msg)
	}

	return &notionResp, nil
}

// NotionExportDoc 导出 Notion 文档
func (c *Client) NotionExportDoc(ctx context.Context, uuid, docID, kbId string) (*NotionExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = notionExportPath
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

	c.logger.Info("NotionExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp NotionExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
