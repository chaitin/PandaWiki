package usecase

import (
	"archive/zip"
	"compress/gzip"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"golang.org/x/sync/semaphore"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type WikiJSUsecase struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
}

func NewWikiJSUsecase(logger *log.Logger, minioClient *s3.MinioClient) *WikiJSUsecase {
	return &WikiJSUsecase{
		logger:      logger.WithModule("usecase.wikiJSUsecase"),
		minioClient: minioClient,
	}
}

func (u *WikiJSUsecase) AnalysisExportFile(ctx context.Context, f *multipart.FileHeader, kbID string) (*[]domain.WikiJSResp, error) {
	file, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()
	zipReader, err := zip.NewReader(file, f.Size)
	if err != nil {
		return nil, err
	}
	pages, err := analysisGzipFile(zipReader.File)
	if err != nil {
		return nil, err
	}
	var wg sync.WaitGroup
	errCh := make(chan error, len(zipReader.File))
	defer close(errCh)
	sem := semaphore.NewWeighted(10) // 控制并发数为10
	OssPath := make(map[string]string)
	for _, f := range zipReader.File {
		if filepath.Base(f.Name) == "pages.json.gz" || strings.HasPrefix(f.Name, "__MACOSX") || strings.HasSuffix(f.Name, ".DS_Store") {
			continue
		}
		name := utils.RemoveFirstDir(f.Name)

		name = strings.TrimPrefix(name, "assets")
		if name == "" || name == "." || name == ".." || name == "/" {
			continue
		}

		u.logger.Info("upload file", log.String("name", name))
		ext := filepath.Ext(name)
		imgName := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)
		osspath := fmt.Sprintf("%s/%s", domain.Bucket, imgName)

		OssPath[utils.UrlEncode(name)] = osspath

		wg.Add(1)
		if err := sem.Acquire(ctx, 1); err != nil {
			return nil, fmt.Errorf("acquire semaphore failed: %v", err)
		}
		go func() {
			defer wg.Done()

			defer sem.Release(1)

			file, err := f.Open()
			if err != nil {
				errCh <- fmt.Errorf("open file failed: %v", err)
				return
			}
			defer file.Close()
			if f.UncompressedSize64 == 0 {
				return
			}

			_, err = u.minioClient.PutObject(
				ctx,
				domain.Bucket,
				imgName,
				file,
				int64(f.UncompressedSize64),
				minio.PutObjectOptions{
					UserMetadata: map[string]string{
						"originalname": name,
					},
				},
			)
			if err != nil {
				errCh <- fmt.Errorf("upload file failed: %v", err)
				return
			}
		}()
	}

	wg.Wait()
	exchangeUrl(pages, OssPath)

	select {
	case err := <-errCh:
		if err != nil {
			return nil, err
		}
	default:
	}
	var res []domain.WikiJSResp
	for _, page := range *pages {
		res = append(res, domain.WikiJSResp{
			Id:      page.Id,
			Title:   page.Title,
			Content: page.Render,
		})
	}
	return &res, nil
}

// 正则表达式匹配 <a href=""> 和 <img src="">
var (
	re    = regexp.MustCompile(`!\[(.*?)\]\((.*?)\)`)
	reA   = regexp.MustCompile(`<a[^>]+href=["'](.*?)["']`)
	reImg = regexp.MustCompile(`<img[^>]+src=["'](.*?)["']`)
)

// 替换图片链接
func exchangeUrl(pages *[]domain.WikiJSPage, OssPath map[string]string) {
	for i, page := range *pages {
		newContent := re.ReplaceAllStringFunc(page.Render, func(match string) string {
			title := re.ReplaceAllString(match, `$1`)
			url := re.ReplaceAllString(match, `$2`)
			if newUrl, exists := OssPath[url]; exists {
				return fmt.Sprintf(`![%s](%s)`, title, newUrl)
			}
			return match // 未找到替换时返回原内容
		})

		// 替换 <a href="">
		newContent = reA.ReplaceAllStringFunc(newContent, func(match string) string {
			url := reA.ReplaceAllString(match, `$1`)
			if newUrl, exists := OssPath[url]; exists {
				return reA.ReplaceAllString(match, `<a href="`+newUrl+`"`)
			}
			return match // 未找到替换时返回原内容
		})

		// 替换 <img src="">
		newContent = reImg.ReplaceAllStringFunc(newContent, func(match string) string {
			url := reImg.ReplaceAllString(match, `$1`)
			if newUrl, exists := OssPath[url]; exists {
				return reImg.ReplaceAllString(match, `<img src="`+newUrl+`"`)
			}
			return match // 未找到替换时返回原内容
		})

		(*pages)[i].Render = newContent
	}
}

func analysisGzipFile(zipFile []*zip.File) (*[]domain.WikiJSPage, error) {
	var pages []domain.WikiJSPage

	for _, f := range zipFile {
		if filepath.Base(f.Name) == "pages.json.gz" {
			file, err := f.Open()
			if err != nil {
				return nil, err
			}
			defer file.Close()
			gzReader, err := gzip.NewReader(file)
			if err != nil {
				return nil, err
			}
			data, err := io.ReadAll(gzReader)
			if err != nil {
				return nil, err
			}
			if err := json.Unmarshal(data, &pages); err != nil {
				return nil, err
			}
			continue
		}
	}
	return &pages, nil
}
