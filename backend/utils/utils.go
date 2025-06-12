package utils

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/google/uuid"
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

func GenerateId() string {
	return uuid.New().String()
}
