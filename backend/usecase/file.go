package usecase

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type FileUsecase struct {
	logger            *log.Logger
	s3Client          *s3.MinioClient
	config            *config.Config
	systemSettingRepo *pg.SystemSettingRepo
	httpClient        *http.Client
}

func NewFileUsecase(logger *log.Logger, s3Client *s3.MinioClient, config *config.Config, systemSettingRepo *pg.SystemSettingRepo) *FileUsecase {
	return &FileUsecase{
		s3Client:          s3Client,
		logger:            logger.WithModule("usecase.file"),
		config:            config,
		systemSettingRepo: systemSettingRepo,
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				// Prevent redirects to bypass SSRF checks
				return http.ErrUseLastResponse
			},
		},
	}
}

func (u *FileUsecase) UploadFileGetUrl(ctx context.Context, kbID string, file *multipart.FileHeader) (string, error) {
	key, err := u.UploadFile(ctx, kbID, file)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("http://panda-wiki-minio:9000/static-file/%s", key), nil
}

func (u *FileUsecase) UploadFile(ctx context.Context, kbID string, file *multipart.FileHeader) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	ext := strings.ToLower(filepath.Ext(file.Filename))

	// Check denied extensions
	if err := u.checkDeniedExtension(ctx, ext); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	size := file.Size

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
	}

	resp, err := u.s3Client.PutObject(
		ctx,
		domain.Bucket,
		filename,
		src,
		size,
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": file.Filename,
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}

	return resp.Key, nil
}

func (u *FileUsecase) UploadFileFromBytes(ctx context.Context, kbID string, filename string, fileBytes []byte) (string, error) {
	// Create a reader from the byte slice
	reader := bytes.NewReader(fileBytes)

	ext := strings.ToLower(filepath.Ext(filename))

	// Check denied extensions
	if err := u.checkDeniedExtension(ctx, ext); err != nil {
		return "", err
	}

	s3Filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	size := int64(len(fileBytes))

	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		// Fallback content type if extension not recognized
		contentType = "application/octet-stream"
	}

	resp, err := u.s3Client.PutObject(
		ctx,
		domain.Bucket,
		s3Filename,
		reader,
		size,
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": filename,
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}

	return resp.Key, nil
}

func (u *FileUsecase) UploadFileFromReader(
	ctx context.Context,
	kbID string,
	filename string,
	reader io.Reader,
	size int64, // 必须提供对象大小
) (string, error) {
	// 生成唯一文件名
	ext := strings.ToLower(filepath.Ext(filename))

	// Check denied extensions
	if err := u.checkDeniedExtension(ctx, ext); err != nil {
		return "", err
	}

	s3Filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	// 获取内容类型
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream" // 默认类型
	}

	// 上传到 S3
	_, err := u.s3Client.PutObject(
		ctx,
		domain.Bucket,
		s3Filename,
		reader,
		size, // 必须提供对象大小
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": filename,
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("S3 upload failed: %w", err)
	}

	return s3Filename, nil
}

func (u *FileUsecase) AnyDocUploadFile(ctx context.Context, file *multipart.FileHeader, path string) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	ext := strings.ToLower(filepath.Ext(file.Filename))

	// Check denied extensions
	if err := u.checkDeniedExtension(ctx, ext); err != nil {
		return "", err
	}

	size := file.Size

	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = mime.TypeByExtension(ext)
	}

	resp, err := u.s3Client.PutObject(
		ctx,
		domain.Bucket,
		path,
		src,
		size,
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": file.Filename,
			},
		},
	)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}

	return resp.Key, nil
}

func (u *FileUsecase) UploadFileByUrl(ctx context.Context, kbID string, fileURL string) (string, error) {
	// Validate URL to prevent SSRF attacks
	if err := utils.ValidateURLForSSRF(fileURL); err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := u.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download file: %w", err)
	}
	defer resp.Body.Close()

	// Handle redirects manually to re-validate each redirect target
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		return "", fmt.Errorf("redirects are not allowed for security reasons")
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download file, status: %d", resp.StatusCode)
	}

	const maxRemoteFileSize = 50 * 1024 * 1024 // 50MB
	lr := io.LimitReader(resp.Body, maxRemoteFileSize+1)
	data, err := io.ReadAll(lr)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}
	if len(data) > maxRemoteFileSize {
		return "", fmt.Errorf("failed to read response body: file size exceeds limit of %d bytes", maxRemoteFileSize)
	}

	urlPath := fileURL
	if idx := strings.Index(urlPath, "?"); idx != -1 {
		urlPath = urlPath[:idx]
	}
	ext := strings.ToLower(filepath.Ext(urlPath))

	if err := u.checkDeniedExtension(ctx, ext); err != nil {
		return "", err
	}

	s3Filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	// Derive content type from the actual data instead of trusting the remote header
	contentType := http.DetectContentType(data)
	if contentType == "" || contentType == "application/octet-stream" {
		if extType := mime.TypeByExtension(ext); extType != "" {
			contentType = extType
		} else {
			contentType = "application/octet-stream"
		}
	}

	putResp, err := u.s3Client.PutObject(
		ctx,
		domain.Bucket,
		s3Filename,
		bytes.NewReader(data),
		int64(len(data)),
		minio.PutObjectOptions{
			ContentType: contentType,
		},
	)
	if err != nil {
		return "", fmt.Errorf("upload failed: %w", err)
	}

	return putResp.Key, nil
}

// checkDeniedExtension checks if the file extension is in the denied list
func (u *FileUsecase) checkDeniedExtension(ctx context.Context, ext string) error {
	// Remove leading dot from extension
	ext = strings.TrimPrefix(ext, ".")
	if ext == "" {
		return nil
	}

	// Get denied extensions from system settings
	setting, err := u.systemSettingRepo.GetSystemSetting(ctx, consts.SystemSettingUpload)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		u.logger.Error("failed to get upload denied extensions setting", "error", err)
		return nil // Don't block upload if we can't read settings
	}

	var deniedSetting domain.UploadDeniedExtensionsSetting
	if err := json.Unmarshal(setting.Value, &deniedSetting); err != nil {
		u.logger.Error("failed to unmarshal denied extensions setting", "error", err)
		return nil // Don't block upload if settings are malformed
	}

	// Check if extension is denied
	for _, deniedExt := range deniedSetting.DeniedExtensions {
		if strings.EqualFold(ext, deniedExt) {
			return fmt.Errorf("file extension '.%s' is not allowed for upload", ext)
		}
	}

	return nil
}
