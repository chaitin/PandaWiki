package anydoc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

const (
	yuqueListPath   = "/api/docs/yuque/list"
	yuqueExportPath = "/api/docs/yuque/export"
)

// YuqueListDocsRequest Yuque 获取文档列表请求
type YuqueListDocsRequest struct {
	URL      string `json:"url"`      // Yuque 配置文件
	Filename string `json:"filename"` // 文件名，需要带扩展名
	UUID     string `json:"uuid"`     // 必填的唯一标识符
}

// YuqueListDocsResponse Yuque 获取文档列表响应
type YuqueListDocsResponse struct {
	Success bool              `json:"success"`
	Msg     string            `json:"msg"`
	Data    YuqueListDocsData `json:"data"`
}

// YuqueListDocsData Yuque 文档列表数据
type YuqueListDocsData struct {
	Docs []YuqueDoc `json:"docs"`
}

// YuqueDoc Yuque 文档信息
type YuqueDoc struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

// YuqueExportDocRequest Yuque 导出文档请求
type YuqueExportDocRequest struct {
	UUID  string `json:"uuid"`   // 必须与 list 接口使用的 uuid 相同
	DocID string `json:"doc_id"` // yuque-doc-id
}

// YuqueExportDocResponse Yuque 导出文档响应
type YuqueExportDocResponse struct {
	Success bool   `json:"success"`
	Msg     string `json:"msg"`
	Data    string `json:"data"`
}

// YuqueListDocs 获取 Yuque 文档列表
func (c *Client) YuqueListDocs(ctx context.Context, yuqueURL, filename, uuid string) (*ListDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = yuqueListPath
	requestURL := u.String()

	bodyMap := map[string]interface{}{
		"url":      yuqueURL,
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

	c.logger.Info("YuqueListDocs", "requestURL:", requestURL, "resp", string(respBody))

	var yuqueResp ListDocResponse
	err = json.Unmarshal(respBody, &yuqueResp)
	if err != nil {
		return nil, err
	}

	if !yuqueResp.Success {
		return nil, fmt.Errorf("yuque list docs API failed - URL: %s, UUID: %s, Error: %s", yuqueURL, uuid, yuqueResp.Msg)
	}

	return &yuqueResp, nil
}

// YuqueExportDoc 导出 Yuque 文档
func (c *Client) YuqueExportDoc(ctx context.Context, uuid, docID, kbId string) (*YuqueExportDocResponse, error) {
	u, err := url.Parse(crawlerServiceHost)
	if err != nil {
		return nil, err
	}
	u.Path = yuqueExportPath
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

	c.logger.Info("YuqueExportDoc", "requestURL:", requestURL, "resp", string(respBody))

	var exportResp YuqueExportDocResponse
	err = json.Unmarshal(respBody, &exportResp)
	if err != nil {
		return nil, err
	}

	if !exportResp.Success {
		return nil, fmt.Errorf("yuque export doc API failed - UUID: %s, DocID: %s, Error: %s", uuid, docID, exportResp.Msg)
	}

	return &exportResp, nil
}
