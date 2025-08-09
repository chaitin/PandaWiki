package usecase

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/url"
	"path/filepath"
	"strings"

	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/semaphore"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/utils"
)

type SiYuanUsecase struct {
	logger      *log.Logger
	fileusecase *FileUsecase
}

func NewShiYuanUsecase(logger *log.Logger, fileusecase *FileUsecase) *SiYuanUsecase {
	return &SiYuanUsecase{
		logger:      logger.WithModule("usecase.siyuanUsecase"),
		fileusecase: fileusecase,
	}
}

func (u *SiYuanUsecase) AnalysisExportFile(ctx context.Context, fileHeader *multipart.FileHeader, kbID string) ([]domain.SiYuanResp, error) {
	reader, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("open file failed: %v", err)
	}
	defer reader.Close()
	zipReader, err := zip.NewReader(reader, fileHeader.Size)
	if err != nil {
		return nil, err
	}
	var results []domain.SiYuanResp
	type uploadResulet struct {
		fileName string
		keys     string
	}

	// 使用 errgroup 和信号量控制并发
	const maxConcurrency = 10
	sem := semaphore.NewWeighted(maxConcurrency)

	// 预分配结果 slice
	nonMdFiles := make([]*zip.File, 0)
	for _, file := range zipReader.File {
		ext := filepath.Ext(strings.ToLower(file.Name))
		if ext != ".md" {
			nonMdFiles = append(nonMdFiles, file)
		}
	}

	uploadResults := make([]uploadResulet, len(nonMdFiles))
	g, ctx := errgroup.WithContext(ctx)

	for i, file := range nonMdFiles {
		// 为每个文件创建闭包
		index := i
		f := file
		g.Go(func() error {
			// 获取信号量
			if err := sem.Acquire(ctx, 1); err != nil {
				return err
			}
			defer sem.Release(1)

			File, err := f.Open()
			if err != nil {
				u.logger.Error("open file failed")
				return fmt.Errorf("open file failed: %v", err)
			}
			defer File.Close()

			// 处理资源文件
			key, err := u.fileusecase.UploadFileFromReader(
				ctx,
				kbID,
				f.Name,
				File,
				f.FileInfo().Size(),
			)
			if err != nil {
				u.logger.Error("upload file failed")
				return fmt.Errorf("upload file failed: %v", err)
			}

			// 存储结果
			uploadResults[index] = uploadResulet{fileName: f.Name, keys: key}
			return nil
		})
	}

	// 等待所有上传任务完成
	if err := g.Wait(); err != nil {
		return nil, err
	}

	// 构建文件名到key的映射
	ossPathMap := make(map[string]string)
	for _, res := range uploadResults {
		if res.fileName != "" && res.keys != "" {
			ossPathMap[res.fileName] = res.keys
		}
	}

	// 处理md文件
	for _, file := range zipReader.File {
		fileName := file.Name
		ext := filepath.Ext(strings.ToLower(fileName))
		if ext != ".md" {
			continue
		}
		File, err := file.Open()
		if err != nil {
			u.logger.Error("open file failed")
			return nil, fmt.Errorf("open file failed: %v", err)
		}
		defer File.Close()
		content, _ := io.ReadAll(File)
		newContent, err := utils.ExchangeMarkDownImageUrl(ctx, content, func(ctx context.Context, originUrl *string) (string, error) {
			if originUrl == nil {
				return "", nil
			}
			absPath := filepath.Join(filepath.Dir(fileName), *originUrl)
			unescapeStr, err := url.PathUnescape(filepath.Base(absPath))
			if err != nil {
				u.logger.Error("url path unescape failed")
				return "", fmt.Errorf("url path unescape failed: %v", err)
			}
			absPath = filepath.Join(filepath.Dir(absPath), unescapeStr)
			ossKey, ok := ossPathMap[absPath]
			if !ok {
				return "", fmt.Errorf("oss key not found for url")
			}
			return fmt.Sprintf("/%s/%s", domain.Bucket, ossKey), nil
		})
		if err != nil {
			u.logger.Error("exchange markdown image url failed")
			return nil, fmt.Errorf("exchange markdown image url failed: %v", err)
		}
		resp := domain.SiYuanResp{
			Title:   fileName,
			Content: string(newContent),
		}
		results = append(results, resp)
	}

	return results, nil
}
