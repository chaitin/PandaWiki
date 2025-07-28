package utils

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/JohannesKaufmann/html-to-markdown/v2/converter"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/base"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/commonmark"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/store/s3"
)

// HTTPGet send http get request
func HTTPGet(url string) ([]byte, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}

	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get %s: %v", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// DecodeBytes decode bytes
func DecodeBytes(data []byte) string {
	// try different encodings
	encodings := []string{"utf-8", "gbk", "gb2312", "big5"}
	for _, enc := range encodings {
		if decoded, err := decode(data, enc); err == nil {
			return decoded
		}
	}
	return string(data)
}

// IsURLValid check if url is valid
func IsURLValid(urlStr string) bool {
	u, err := url.Parse(urlStr)
	if err != nil {
		return false
	}
	return u.Scheme != "" && u.Host != ""
}

// URLNormalize normalize url
func URLNormalize(urlStr string) string {
	u, err := url.Parse(urlStr)
	if err != nil {
		return urlStr
	}

	// remove url fragment
	u.Fragment = ""

	// normalize path
	u.Path = path.Clean(u.Path)

	// remove default port
	if u.Port() == "80" && u.Scheme == "http" {
		u.Host = u.Hostname()
	} else if u.Port() == "443" && u.Scheme == "https" {
		u.Host = u.Hostname()
	}

	return u.String()
}

func URLRemovePath(rawURL string) (string, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	parsedURL.Path = ""
	parsedURL.RawPath = ""
	parsedURL.RawQuery = ""
	parsedURL.Fragment = ""

	return parsedURL.String(), nil
}

// decode decode bytes with specified encoding
func decode(data []byte, encoding string) (string, error) {
	// need to implement encoding conversion based on actual needs
	// use golang.org/x/text/encoding package
	return string(data), nil
}

// GetHeaderMap get header map
func GetHeaderMap(header string) map[string]string {
	headerMap := make(map[string]string)
	for _, h := range strings.Split(header, "\n") {
		if key, value, ok := strings.Cut(h, "="); ok {
			headerMap[key] = value
		}
	}
	return headerMap
}

func UrlEncode(s string) string {
	var encoded strings.Builder
	for _, r := range s {
		if r == '/' {
			encoded.WriteRune(r)
		} else if r < 128 {
			encoded.WriteRune(r)
		} else {
			encoded.WriteString(url.QueryEscape(string(r)))
		}
	}
	return encoded.String()
}

func RemoveFirstDir(path string) string {
	// 分割路径为组成部分
	parts := strings.Split(filepath.ToSlash(path), "/")

	// 确保路径有多个部分
	if len(parts) > 1 {
		return filepath.Join(parts[1:]...)
	}
	return path
}

// RemoveURLParams 去除 URL 中的查询参数
func RemoveURLParams(rawURL string) (string, error) {
	// 解析 URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	// 清空查询字符串部分
	parsedURL.RawQuery = ""

	// 返回处理后的 URL
	return parsedURL.String(), nil
}

func UploadImage(ctx context.Context, minioClient *s3.MinioClient, imageURL string, kbID string) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("minio client is nil")
	}
	var data []byte
	var contentType string
	if strings.HasPrefix(imageURL, "http://") || strings.HasPrefix(imageURL, "https://") {
		resp, err := http.Get(imageURL)
		if err != nil {
			return "", fmt.Errorf("failed to fetch image: %v", err)
		}
		defer resp.Body.Close()

		// 检查状态码
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("HTTP request failed with status: %s", resp.Status)
		}

		// 读取图片数据
		data, err = io.ReadAll(resp.Body)
		if err != nil {
			return "", fmt.Errorf("failed to read image data: %v", err)
		}

		// 获取 Content-Type
		contentType = resp.Header.Get("Content-Type")
	} else {
		// 从本地文件系统读取图片
		var err error
		data, err = os.ReadFile(imageURL)
		if err != nil {
			return "", fmt.Errorf("failed to read image file: %v", err)
		}
	}

	// 获取图片名称（从 URL 路径中提取）
	parsedURL, err := url.Parse(imageURL)
	if err != nil {
		return "", fmt.Errorf("failed to parse URL: %v", err)
	}
	_, filename := filepath.Split(parsedURL.Path)
	// 解码可能的 URL 编码（如中文文件名）
	decodedName, err := url.PathUnescape(filename)
	if err != nil {
		decodedName = filename // 如果解码失败，使用原始名称
	}

	ext := strings.ToLower(filepath.Ext(decodedName))
	if ext == "" {
		contentType = mime.TypeByExtension(ext)
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	imgName := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	if _, err := minioClient.PutObject(
		ctx,
		domain.Bucket,
		imgName,
		bytes.NewReader(data),
		int64(len(data)),
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": decodedName,
			},
		},
	); err != nil {
		return "", fmt.Errorf("failed to upload image to MinIO: %v", err)
	}
	return fmt.Sprintf("/%s/%s", domain.Bucket, imgName), nil
}

func GetTitleFromMarkdown(markdown string) string {
	title := strings.TrimSpace(markdown)
	runes := []rune(title)
	if len(runes) > 60 {
		return string(runes[:60])
	}
	return title
}

func ExchangeMarkDownImageUrl(
	ctx context.Context,
	mdContent []byte,
	getUrl func(ctx context.Context, originUrl *string) (string, error),
) (string, error) {
	md := goldmark.New(
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
		),
	)
	reader := text.NewReader(mdContent)
	doc := md.Parser().Parse(reader)

	// 1. 收集图片节点和原始URL
	type imgTask struct {
		node   *ast.Image
		rawUrl string
	}
	var tasks []imgTask

	if err := ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if img, ok := n.(*ast.Image); ok {
			rawUrl := string(img.Destination)
			tasks = append(tasks, imgTask{img, rawUrl})
		}
		return ast.WalkContinue, nil
	}); err != nil {
		return "", err
	}

	// 2. 并发获取新URL
	type result struct {
		idx    int
		newUrl string
		err    error
	}

	results := make(chan result, len(tasks))
	var wg sync.WaitGroup

	for i, t := range tasks {
		wg.Add(1)
		go func(idx int, rawUrl string) {
			defer wg.Done()
			newUrl, err := getUrl(ctx, &rawUrl)
			results <- result{idx, newUrl, err}
		}(i, t.rawUrl)
	}

	// 关闭结果通道当所有goroutine完成时
	go func() {
		wg.Wait()
		close(results)
	}()

	// 3. 处理结果
	for res := range results {
		if res.err != nil {
			return "", res.err
		}
		tasks[res.idx].node.Destination = []byte(res.newUrl)
	}

	// 4. 渲染Markdown
	var buf bytes.Buffer
	if err := md.Renderer().Render(&buf, mdContent, doc); err != nil {
		return "", err
	}

	// 5. 转换并返回字符串
	conv := converter.NewConverter(
		converter.WithPlugins(
			base.NewBasePlugin(),
			commonmark.NewCommonmarkPlugin(
				commonmark.WithStrongDelimiter("__"),
			),
		),
	)
	converted, err := conv.ConvertReader(&buf)
	if err != nil {
		return "", err
	}
	return string(converted), nil
}
