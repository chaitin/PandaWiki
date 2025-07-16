package usecase

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
)

type FileUsecase struct {
	logger   *log.Logger
	s3Client *s3.MinioClient
	config   *config.Config
}

func NewFileUsecase(logger *log.Logger, s3Client *s3.MinioClient, config *config.Config) *FileUsecase {
	return &FileUsecase{
		s3Client: s3Client,
		logger:   logger.WithModule("usecase.file"),
		config:   config,
	}
}

func (u *FileUsecase) UploadFile(ctx context.Context, kbID string, file *multipart.FileHeader) (string, error) {
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	ext := strings.ToLower(filepath.Ext(file.Filename))
	filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	maxSize := u.config.S3.MaxFileSize
	size := file.Size
	if size > int64(maxSize) { // 100MB
		return "", fmt.Errorf("file size too large")
	}

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
	s3Filename := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	maxSize := u.config.S3.MaxFileSize
	size := int64(len(fileBytes))
	if size > int64(maxSize) { // 100MB
		return "", fmt.Errorf("file size too large")
	}

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
	// 验证对象大小
	maxSize := u.config.S3.MaxFileSize
	if size > int64(maxSize) {
		return "", fmt.Errorf("file size too large (max %d bytes, got %d)", maxSize, size)
	}

	// 生成唯一文件名
	ext := strings.ToLower(filepath.Ext(filename))
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
