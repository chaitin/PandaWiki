package rag

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// UploadDocumentsAndParse 上传文档并解析（支持多文件和权限设置）
func (c *Client) UploadDocumentsAndParse(ctx context.Context, datasetID string, filePaths []string, groupIDs []int, metadata *DocumentMetadata) ([]Document, error) {
	documents, err := c.UploadDocuments(ctx, datasetID, filePaths, groupIDs, metadata)
	if err != nil {
		return nil, err
	}
	if len(documents) == 0 {
		return nil, nil
	}

	docIDs := make([]string, len(documents))
	for i, doc := range documents {
		docIDs[i] = doc.ID
	}

	err = c.ParseDocuments(ctx, datasetID, docIDs)
	if err != nil {
		return nil, err
	}

	return documents, nil
}

// UploadDocuments 上传文档（支持多文件和权限设置）
func (c *Client) UploadDocuments(ctx context.Context, datasetID string, filePaths []string, groupIDs []int, metadata *DocumentMetadata) ([]Document, error) {
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	for _, path := range filePaths {
		file, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		fw, err := w.CreateFormFile("file", filepath.Base(path))
		if err != nil {
			return nil, err
		}
		if _, err := io.Copy(fw, file); err != nil {
			return nil, err
		}
	}

	// 添加 group_ids：nil 不写入，空切片 [] 会写入 "[]"
	if groupIDs != nil {
		gids, err := json.Marshal(groupIDs)
		if err != nil {
			return nil, err
		}
		if err := w.WriteField("group_ids", string(gids)); err != nil {
			return nil, err
		}
	}

	// 添加 metadata：nil 不写入
	if metadata != nil {
		metadataBytes, err := json.Marshal(metadata)
		if err != nil {
			return nil, err
		}
		if err := w.WriteField("metadata", string(metadataBytes)); err != nil {
			return nil, err
		}
	}
	w.Close()

	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL.JoinPath(urlPath).String(), &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, parseErrorResponse(resp)
	}

	var result UploadDocumentResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

// DownloadDocument 下载文档到本地
func (c *Client) DownloadDocument(ctx context.Context, datasetID, documentID, outputPath string) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/%s", datasetID, documentID)
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL.JoinPath(urlPath).String(), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return parseErrorResponse(resp)
	}

	out, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
}

// ListDocuments 列出文档
func (c *Client) ListDocuments(ctx context.Context, datasetID string, params map[string]string) ([]Document, int, error) {
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := c.newRequest(ctx, "GET", urlPath, nil)
	if err != nil {
		return nil, 0, err
	}
	q := req.URL.Query()
	for k, v := range params {
		q.Add(k, v)
	}
	req.URL.RawQuery = q.Encode()

	var resp ListDocumentsResponse
	if err := c.do(req, &resp); err != nil {
		return nil, 0, err
	}
	return resp.Data.Docs, resp.Data.Total, nil
}

// DeleteDocuments 删除文档（支持批量）
func (c *Client) DeleteDocuments(ctx context.Context, datasetID string, ids []string) error {
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	body := DeleteDocumentsRequest{IDs: ids}
	req, err := c.newRequest(ctx, "DELETE", urlPath, body)
	if err != nil {
		return err
	}
	var resp DeleteDocumentsResponse
	return c.do(req, &resp)
}

// UpdateDocument 更新文档
func (c *Client) UpdateDocument(ctx context.Context, datasetID, documentID string, reqBody UpdateDocumentRequest) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/%s", datasetID, documentID)
	req, err := c.newRequest(ctx, "PUT", urlPath, reqBody)
	if err != nil {
		return err
	}
	var resp UpdateDocumentResponse
	return c.do(req, &resp)
}

// UpdateDocumentGroupIDs 更新单个文档的权限
func (c *Client) UpdateDocumentGroupIDs(ctx context.Context, datasetID, documentID string, groupIDs []int) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/%s/group_ids", datasetID, documentID)
	body := map[string]interface{}{}
	if groupIDs != nil {
		body["group_ids"] = groupIDs
	}
	req, err := c.newRequest(ctx, "PUT", urlPath, body)
	if err != nil {
		return err
	}
	var resp interface{}
	return c.do(req, &resp)
}

// UpdateDocumentsGroupIDsBatch 批量更新文档的权限
func (c *Client) UpdateDocumentsGroupIDsBatch(ctx context.Context, datasetID string, documentIDs []string, groupIDs []int) error {
	urlPath := fmt.Sprintf("datasets/%s/documents/batch/group_ids", datasetID)
	body := map[string]interface{}{
		"document_ids": documentIDs,
	}
	if groupIDs != nil {
		body["group_ids"] = groupIDs
	}
	req, err := c.newRequest(ctx, "PUT", urlPath, body)
	if err != nil {
		return err
	}
	var resp interface{}
	return c.do(req, &resp)
}

// UploadDocumentText 上传文本内容为文档
// jsonStr 形如 {"filename": "xxx.txt", "content": "...", "file_type": "text/plain", "group_ids": [1,2,3], "metadata": {...}}
func (c *Client) UploadDocumentText(ctx context.Context, datasetID string, jsonStr string) ([]Document, error) {
	type input struct {
		Filename string            `json:"filename"`
		Content  string            `json:"content"`
		FileType string            `json:"file_type"`
		GroupIDs []int             `json:"group_ids,omitempty"`
		Metadata *DocumentMetadata `json:"metadata,omitempty"`
	}
	var in input
	if err := json.Unmarshal([]byte(jsonStr), &in); err != nil {
		return nil, err
	}
	if in.Filename == "" || in.Content == "" {
		return nil, fmt.Errorf("filename和content不能为空")
	}

	// 如果未指定文件类型，根据文件名后缀推断
	if in.FileType == "" {
		ext := filepath.Ext(in.Filename)
		switch strings.ToLower(ext) {
		case ".txt":
			in.FileType = "text/plain"
		case ".md":
			in.FileType = "text/markdown"
		case ".html":
			in.FileType = "text/html"
		case ".json":
			in.FileType = "application/json"
		case ".xml":
			in.FileType = "application/xml"
		case ".csv":
			in.FileType = "text/csv"
		default:
			in.FileType = "text/plain"
		}
	}

	// 创建临时文件
	tmpFile, err := os.CreateTemp("", in.Filename+"_*")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	if _, err := tmpFile.WriteString(in.Content); err != nil {
		return nil, err
	}
	if err := tmpFile.Sync(); err != nil {
		return nil, err
	}

	// 重新打开文件以确保内容被写入
	tmpFile.Close()
	tmpFile, err = os.Open(tmpFile.Name())
	if err != nil {
		return nil, err
	}
	defer tmpFile.Close()

	// 创建multipart请求
	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	// 添加文件
	fw, err := w.CreateFormFile("file", in.Filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(fw, tmpFile); err != nil {
		return nil, err
	}

	// 添加文件类型
	if err := w.WriteField("file_type", in.FileType); err != nil {
		return nil, err
	}

	// 添加 group_ids：nil 不写入，空切片 [] 会写入 "[]"
	if in.GroupIDs != nil {
		gids, err := json.Marshal(in.GroupIDs)
		if err != nil {
			return nil, err
		}
		if err := w.WriteField("group_ids", string(gids)); err != nil {
			return nil, err
		}
	}

	// 添加 metadata：nil 不写入
	if in.Metadata != nil {
		metadataBytes, err := json.Marshal(in.Metadata)
		if err != nil {
			return nil, err
		}
		if err := w.WriteField("metadata", string(metadataBytes)); err != nil {
			return nil, err
		}
	}

	w.Close()

	// 发送请求
	urlPath := fmt.Sprintf("datasets/%s/documents", datasetID)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL.JoinPath(urlPath).String(), &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	// 打印请求内容以便调试
	fmt.Printf("发送请求到: %s\n", req.URL.String())
	fmt.Printf("Content-Type: %s\n", req.Header.Get("Content-Type"))
	fmt.Printf("文件大小: %d bytes\n", b.Len())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("上传失败: %s, 状态码: %d, 响应: %s", parseErrorResponse(resp), resp.StatusCode, string(body))
	}

	var result UploadDocumentResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

// UploadDocumentTextAndParse 上传文本内容为文档并解析
func (c *Client) UploadDocumentTextAndParse(ctx context.Context, datasetID string, jsonStr string) ([]Document, error) {
	documents, err := c.UploadDocumentText(ctx, datasetID, jsonStr)
	if err != nil {
		return nil, err
	}
	if len(documents) == 0 {
		return nil, nil
	}

	docIDs := make([]string, len(documents))
	for i, doc := range documents {
		docIDs[i] = doc.ID
	}

	err = c.ParseDocuments(ctx, datasetID, docIDs)
	if err != nil {
		return nil, err
	}

	return documents, nil
}

// UpdateDocumentText 更新文档内容
// 使用新的 content 接口直接更新文档内容
func (c *Client) UpdateDocumentText(ctx context.Context, datasetID string, documentID string, content string, filename string) (*Document, error) {
	// 创建临时文件
	tmpFile, err := os.CreateTemp("", "update_*")
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// 写入内容到临时文件
	if _, err := tmpFile.WriteString(content); err != nil {
		return nil, err
	}
	if err := tmpFile.Sync(); err != nil {
		return nil, err
	}

	// 重新打开文件以确保内容被写入
	tmpFile.Close()
	tmpFile, err = os.Open(tmpFile.Name())
	if err != nil {
		return nil, err
	}
	defer tmpFile.Close()

	fileInfo, err := tmpFile.Stat()
	if err != nil {
		return nil, err
	}

	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	fw, err := w.CreateFormFile("file", filename)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(fw, tmpFile); err != nil {
		return nil, err
	}

	w.Close()

	urlPath := fmt.Sprintf("datasets/%s/documents/%s/content", datasetID, documentID)
	req, err := http.NewRequestWithContext(ctx, "PUT", c.baseURL.JoinPath(urlPath).String(), &b)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("更新文档内容失败: %s, 状态码: %d, 响应: %s", parseErrorResponse(resp), resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	doc, err := c.GetDocument(ctx, datasetID, documentID)
	if err != nil {
		return nil, fmt.Errorf("更新成功但获取文档信息失败: %w", err)
	}

	return doc, nil
}
