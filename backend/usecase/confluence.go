package usecase

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/JohannesKaufmann/html-to-markdown/v2/converter"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/base"
	"github.com/JohannesKaufmann/html-to-markdown/v2/plugin/commonmark"
	"github.com/google/uuid"
	"github.com/samber/lo"
	"github.com/samber/lo/parallel"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type ConfluenceUsecase struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
	crawler     *CrawlerUsecase
	file        *FileUsecase
}

func NewConfluenceUsecase(logger *log.Logger, minio *s3.MinioClient, crawler *CrawlerUsecase, file *FileUsecase) *ConfluenceUsecase {
	return &ConfluenceUsecase{
		logger:      logger.WithModule("usecase.confluenceusecase"),
		minioClient: minio,
		crawler:     crawler,
		file:        file,
	}
}

func (c *ConfluenceUsecase) Analysis(ctx context.Context, data []byte, kbid string) ([]domain.AnalysisConfluenceResp, error) {
	r := bytes.NewReader(data)
	zipReader, err := zip.NewReader(r, int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("failed to read zip file: %w", err)
	}

	// First pass: process resource files concurrently
	resourceFiles := make([]*zip.File, 0)
	for _, zipfile := range zipReader.File {
		if strings.HasPrefix(zipfile.Name, "__MACOSX") || strings.HasSuffix(zipfile.Name, ".DS_Store") {
			continue
		}
		ext := strings.ToLower(filepath.Ext(zipfile.Name))
		if ext != ".html" && ext != ".hml" && ext != ".css" && ext != ".htmlx" {
			resourceFiles = append(resourceFiles, zipfile)
		}
	}
	type Mapping struct {
		oldPath string
		newPath string
	}
	// Concurrently process resource files
	pathMap := parallel.Map(resourceFiles, func(zipfile *zip.File, _ int) *Mapping {
		fileReader, err := zipfile.Open()
		if err != nil {
			c.logger.Error("failed to open zip file: ", log.Error(err))
			return nil
		}
		defer fileReader.Close()

		key, err := c.file.UploadFileFromReader(ctx, kbid, zipfile.Name, fileReader, int64(zipfile.UncompressedSize64))
		if err != nil {
			c.logger.Error("failed to upload file to oss: ", log.Error(err))
			return nil
		}

		return &Mapping{
			oldPath: zipfile.Name,
			newPath: fmt.Sprintf("/%s/%s", domain.Bucket, key),
		}
	})

	defeatResult := lo.Filter(pathMap, func(mapping *Mapping, _ int) bool {
		return mapping == nil
	})
	if len(defeatResult) > 0 {
		return nil, fmt.Errorf("some files failed to be uploaded")
	}

	// Convert parallel.Map results to pathMap
	pm := make(map[string]string)
	for _, result := range pathMap {
		//	去掉result.oldPath第一级路径。a/b/c -> b/c
		c.logger.Debug("uploaded file to OSS", log.String("file_name", utils.RemoveFirstDir(result.oldPath)), log.String("oss_key", result.newPath))

		pm[utils.RemoveFirstDir(result.oldPath)] = result.newPath
	}

	// Second pass: process HTML files concurrently
	htmlFiles := make([]*zip.File, 0)
	for _, zipfile := range zipReader.File {
		if strings.HasPrefix(zipfile.Name, "__MACOSX") || strings.HasSuffix(zipfile.Name, ".DS_Store") {
			continue
		}
		ext := strings.ToLower(filepath.Ext(zipfile.Name))
		if ext == ".html" || ext == ".htm" || ext == ".htmlx" {
			htmlFiles = append(htmlFiles, zipfile)
		}
	}
	// Concurrently process HTML files
	results := parallel.Map(htmlFiles, func(zipfile *zip.File, _ int) *domain.AnalysisConfluenceResp {
		fileReader, err := zipfile.Open()
		if err != nil {
			c.logger.Error("failed to open zip file:", log.Error(err))
			return nil
		}
		defer fileReader.Close()

		fileData, err := io.ReadAll(fileReader)
		if err != nil {
			c.logger.Error("failed to read file: ", log.Error(err))
			return nil
		}

		conv := converter.NewConverter(
			converter.WithPlugins(
				base.NewBasePlugin(),
				commonmark.NewCommonmarkPlugin(
					commonmark.WithStrongDelimiter("__"),
				),
			),
		)
		conv.Register.TagType("a", converter.TagTypeRemove, converter.PriorityStandard)
		mdStr, _ := conv.ConvertString(string(fileData))
		re := regexp.MustCompile(`!\[\s*(.*?)\s*]\s*\(\s*(.*?)\s*\)`)
		// 替换匹配到的内容，保留捕获的 URL
		newContent := re.ReplaceAllStringFunc(mdStr, func(match string) string {
			// 提取捕获的 URL
			title := re.ReplaceAllString(match, `$1`)
			url := re.ReplaceAllString(match, `$2`)
			// 去掉url后面的参数
			url = strings.SplitN(url, "?", 2)[0]
			if _, ok := pm[url]; ok {
				return fmt.Sprintf(`![%s](%s)`, title, pm[url])
			}
			return fmt.Sprintf(`[%s](%s)`, title, url)
		})
		return &domain.AnalysisConfluenceResp{
			ID:      uuid.NewString(),
			Title:   utils.GetTitleFromMarkdown(newContent),
			Content: newContent,
		}
	})
	defeatResult2 := lo.Filter(results, func(result *domain.AnalysisConfluenceResp, _ int) bool {
		return result == nil
	})
	if len(defeatResult2) > 0 {
		return nil, fmt.Errorf("some html files failed to be processed")
	}

	// Collect final results
	var finalResults []domain.AnalysisConfluenceResp
	for _, result := range results {
		finalResults = append(finalResults, domain.AnalysisConfluenceResp{
			ID:      result.ID,
			Title:   result.Title,
			Content: result.Content,
		})
	}

	return finalResults, nil
}
