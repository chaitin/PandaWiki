package usecase

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"path/filepath"
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

		newContent, err := utils.ExchangeMarkDownImageUrl(ctx, []byte(mdStr), func(ctx context.Context, originUrl *string) (string, error) {
			if originUrl == nil {
				return "", fmt.Errorf("originUrl is nil")
			}

			// 处理 base64 图片
			if strings.HasPrefix(*originUrl, "data:image/") {
				return c.transferBase64Url(ctx, "", kbid, originUrl)
			}

			// 处理普通图片
			cleanUrl, err := utils.RemoveURLParams(*originUrl)
			if err != nil {
				c.logger.Error("remove URL params failed",
					log.String("url", *originUrl),
					log.String("error", err.Error()))
				return "", err
			}

			// 使用相对路径作为 key
			key := utils.RemoveFirstDir(cleanUrl)
			if newUrl, ok := pm[key]; ok {
				return newUrl, nil
			}

			return cleanUrl, nil
		})
		if err != nil {
			c.logger.Error("failed to exchange image URL: ", log.Error(err))
			return nil
		}
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

func (c *ConfluenceUsecase) transferBase64Url(ctx context.Context, fileName, kbID string, url *string) (string, error) {
	// 检查空指针
	if url == nil {
		return "", fmt.Errorf("url is nil")
	}
	rawUrl := *url

	// 1. 验证基本格式
	if !strings.HasPrefix(rawUrl, "data:image/") {
		return "", fmt.Errorf("invalid base64 URL: must start with 'data:image/'")
	}

	// 2. 查找分号和逗号位置
	semicolonPos := strings.Index(rawUrl, ";")
	commaPos := strings.Index(rawUrl, ",")

	// 验证位置有效性
	if semicolonPos == -1 || commaPos == -1 || semicolonPos >= commaPos {
		return "", fmt.Errorf("invalid base64 URL format: missing semicolon or comma")
	}

	// 3. 提取 MIME 类型和 base64 数据
	mimeType := rawUrl[5:semicolonPos] // "data:" 是5个字符
	base64Data := rawUrl[commaPos+1:]

	// 4. 验证编码格式
	encodingPart := rawUrl[semicolonPos+1 : commaPos]
	if encodingPart != "base64" {
		return "", fmt.Errorf("unsupported encoding: only base64 is supported")
	}

	// 5. 确定文件扩展名
	var fileExt string
	if exts, _ := mime.ExtensionsByType(mimeType); len(exts) > 0 {
		fileExt = exts[0] // 取第一个扩展名
	} else {
		// 默认使用 .png 如果无法确定
		fileExt = ".png"
	}

	// 6. 生成文件名
	if fileName == "" {
		fileName = "image"
	}
	fileName = fmt.Sprintf("%s-%s%s", uuid.NewString(), fileName, fileExt)

	// 7. 创建 base64 解码器
	decoder := base64.NewDecoder(base64.StdEncoding, strings.NewReader(base64Data))

	// 8. 计算解码后数据长度
	decodedLen := (len(base64Data) * 3) / 4
	if len(base64Data) > 0 {
		if base64Data[len(base64Data)-1] == '=' {
			decodedLen--
		}
		if len(base64Data) > 1 && base64Data[len(base64Data)-2] == '=' {
			decodedLen--
		}
	}

	// 9. 上传文件
	key, err := c.file.UploadFileFromReader(ctx, kbID, fileName, decoder, int64(decodedLen))
	if err != nil {
		return "", fmt.Errorf("failed to upload image to S3: %w", err)
	}

	return fmt.Sprintf("/%s/%s", domain.Bucket, key), nil
}
