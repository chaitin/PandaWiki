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
	sitemapListPath   = "/api/docs/sitemap/list"
	sitemapExportPath = "/api/docs/sitemap/export"
)

// SitemapListDocsResponse Sitemap 获取文档列表响应
type SitemapListDocsResponse struct {
	Success bool                `json:"success"`
	Msg     string              `json:"msg"`
	Data    SitemapListDocsData `json:"data"`
}

// SitemapListDocsData Sitemap 文档列表数据
type SitemapListDocsData struct {
	Docs []SitemapDoc `json:"docs"`
}

// SitemapDoc Sitemap 文档信息
type SitemapDoc struct {
	Id       string `json:"id"`
	FileType string `json:"file_type"`
	Title    string `json:"title"`
	Summary  string `json:"summary"`
}

// SitemapExportDocRequest Sitemap 导出文档请求
type SitemapExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // sitemap-doc-id
}

// SitemapExportDocResponse Sitemap 导出文档响应
type SitemapExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// SitemapExportDocData Sitemap 导出文档数据
type SitemapExportDocData struct {
	TaskID   string `json:"task_id"`
	Status   string `json:"status"`
	FilePath string `json:"file_path"`
}

// SitemapListDocs 获取 Sitemap 文档列表
func (c *Client) SitemapListDocs(ctx context.Context, xmlUrl, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = sitemapListPath

	q := u.Query()
	q.Set("uuid", uuid)
	q.Set("url", xmlUrl)
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

	c.logger.Info("SitemapListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var sitemapResp ListDocResponse
	err = json.Unmarshal(respBody, &sitemapResp)
	if err != nil {
		return nil, err
	}

	if !sitemapResp.Success {
		return nil, errors.New(sitemapResp.Msg)
	}

	return &sitemapResp, nil
}

// SitemapExportDoc 导出 Sitemap 文档
func (c *Client) SitemapExportDoc(ctx context.Context, uuid, docID, kbId string) (*SitemapExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = sitemapExportPath
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

	c.logger.Info("SitemapExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp SitemapExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, errors.New(exportResp.Msg)
	}

	return &exportResp, nil
}
