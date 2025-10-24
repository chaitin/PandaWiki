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
	epubpListPath   = "/api/docs/epubp/list"
	epubpExportPath = "/api/docs/epubp/export"
)

// EpubpListDocsRequest Epubp 获取文档列表请求
type EpubpListDocsRequest struct {
	URL      string `json:"url"`      // Epubp 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// EpubpListDocsResponse Epubp 获取文档列表响应
type EpubpListDocsResponse struct {
	Success bool              `json:"success"`
	Msg     string            `json:"msg"`
	Data    EpubpListDocsData `json:"data"`
}

// EpubpListDocsData Epubp 文档列表数据
type EpubpListDocsData struct {
	Docs []EpubpDoc `json:"docs"`
}

// EpubpDoc Epubp 文档信息
type EpubpDoc struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// EpubpExportDocRequest Epubp 导出文档请求
type EpubpExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // epubp-doc-id
}

// EpubpExportDocResponse Epubp 导出文档响应
type EpubpExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// EpubpExportDocData Epubp 导出文档数据
type EpubpExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// EpubpListDocs 获取 Epubp 文档列表
func (c *Client) EpubpListDocs(ctx context.Context, epubpURL, filename, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = epubpListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"url":      epubpURL,
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

	c.logger.Info("EpubpListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var epubpResp ListDocResponse
	err = json.Unmarshal(respBody, &epubpResp)
	if err != nil {
		return nil, err
	}

	if !epubpResp.Success {
		return nil, errors.New(epubpResp.Msg)
	}

	return &epubpResp, nil
}

// EpubpExportDoc 导出 Epubp 文档
func (c *Client) EpubpExportDoc(ctx context.Context, uuid, docID, kbId string) (*EpubpExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = epubpExportPath
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

	c.logger.Info("EpubpExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp EpubpExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
