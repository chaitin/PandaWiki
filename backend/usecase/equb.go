package usecase

import (
	"context"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type EpubUsecase struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
}

func NewEpubUsecase(logger *log.Logger, minio *s3.MinioClient) *EpubUsecase {
	return &EpubUsecase{
		logger:      logger.WithModule("usecase.epubusecase"),
		minioClient: minio,
	}
}

func (u *EpubUsecase) Convert(ctx context.Context, kbID string, data []byte) (*domain.EpubResp, error) {
	title, content, err := utils.NewEpubConverter(u.logger, u.minioClient).Convert(ctx, kbID, data)
	if err != nil {
		return nil, err
	}
	return &domain.EpubResp{
		Title:   title,
		Content: string(content),
	}, nil
}
