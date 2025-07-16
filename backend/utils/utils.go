package utils

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

// HTTPGet send http get request
func HTTPGet(url string) ([]byte, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
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
