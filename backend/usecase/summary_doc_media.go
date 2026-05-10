package usecase

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/minio/minio-go/v7"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/store/s3"
)

var (
	reImgRef    = regexp.MustCompile(`(?is)<img[^>]+src\s*=\s*["']([^"']+)["']|!\[[^\]]*\]\(([^)]+)\)`)
	reStripTags = regexp.MustCompile(`(?s)<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>|<[^>]+>`)
	reSpace     = regexp.MustCompile(`\s+`)
)

// ExtractImageRefsFromDocContent returns image URLs or paths in HTML/Markdown body.
func ExtractImageRefsFromDocContent(content string) []string {
	refs := make([]string, 0)
	seen := make(map[string]struct{})
	addRef := func(ref string) {
		ref = strings.TrimSpace(ref)
		if fields := strings.Fields(ref); len(fields) > 0 {
			ref = fields[0]
		}
		if ref == "" {
			return
		}
		if _, ok := seen[ref]; ok {
			return
		}
		seen[ref] = struct{}{}
		refs = append(refs, ref)
	}
	for _, m := range reImgRef.FindAllStringSubmatch(content, -1) {
		if len(m) > 1 && m[1] != "" {
			addRef(m[1])
		} else if len(m) > 2 {
			addRef(m[2])
		}
	}
	return refs
}

// ExtractFirstImageRefFromDocContent returns the first image URL or path in HTML/Markdown body.
func ExtractFirstImageRefFromDocContent(content string) string {
	refs := ExtractImageRefsFromDocContent(content)
	if len(refs) > 0 {
		return refs[0]
	}
	return ""
}

// StripTagsToPlain reduces HTML to plain text for short excerpts.
func StripTagsToPlain(html string) string {
	s := reStripTags.ReplaceAllString(html, " ")
	s = reSpace.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

// StaticFileObjectKeyFromURL extracts Minio object key (e.g. kb/uuid.jpg) from URLs containing /static-file/.
func StaticFileObjectKeyFromURL(ref string) (key string, ok bool) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "", false
	}
	const marker = "/static-file/"
	idx := strings.Index(ref, marker)
	if idx < 0 {
		return "", false
	}
	key = strings.TrimSpace(ref[idx+len(marker):])
	key = strings.TrimPrefix(key, "/")
	if key == "" {
		return "", false
	}
	return key, true
}

// S3ObjectToDataURL reads an object from the static-file bucket and returns a data: URL for vision APIs.
func S3ObjectToDataURL(ctx context.Context, client *s3.MinioClient, objectKey string) (string, error) {
	obj, err := client.GetObject(ctx, domain.Bucket, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("get object %q: %w", objectKey, err)
	}
	defer obj.Close()
	data, err := io.ReadAll(obj)
	if err != nil {
		return "", fmt.Errorf("read object: %w", err)
	}
	if len(data) == 0 {
		return "", fmt.Errorf("empty image object %q", objectKey)
	}
	ct := mime.TypeByExtension(filepath.Ext(objectKey))
	if ct == "" {
		ct = "application/octet-stream"
	}
	b64 := base64.StdEncoding.EncodeToString(data)
	return fmt.Sprintf("data:%s;base64,%s", ct, b64), nil
}

// ResolveImageRefForVision returns an image URL suitable for chat vision APIs:
// public http(s) URLs (without local static path) are returned as-is;
// /static-file/... and MinIO URLs are loaded into a data: URL.
func ResolveImageRefForVision(ctx context.Context, client *s3.MinioClient, ref string) (string, error) {
	ref = strings.TrimSpace(ref)
	if ref == "" {
		return "", fmt.Errorf("empty image reference")
	}
	lower := strings.ToLower(ref)
	isHTTP := strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://")
	if isHTTP && strings.Contains(ref, "/static-file/") {
		key, ok := StaticFileObjectKeyFromURL(ref)
		if ok {
			return S3ObjectToDataURL(ctx, client, key)
		}
	}
	if isHTTP && strings.Contains(lower, "panda-wiki-minio") && strings.Contains(ref, "/static-file/") {
		key, ok := StaticFileObjectKeyFromURL(ref)
		if ok {
			return S3ObjectToDataURL(ctx, client, key)
		}
	}
	if isHTTP {
		return ref, nil
	}
	if strings.HasPrefix(ref, "/static-file/") {
		key := strings.TrimPrefix(ref, "/static-file/")
		key = strings.TrimPrefix(key, "/")
		if key != "" {
			return S3ObjectToDataURL(ctx, client, key)
		}
	}
	return "", fmt.Errorf("unsupported image reference: %q", ref)
}
