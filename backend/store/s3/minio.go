package s3

import (
	"context"
	"fmt"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
)

type MinioClient struct {
	*minio.Client
	config *config.Config
}

func NewMinioClient(config *config.Config) (*MinioClient, error) {
	endpoint := config.S3.Endpoint
	accessKey := config.S3.AccessKey
	secretKey := config.S3.SecretKey

	minioClient, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		return nil, err
	}
	// check bucket
	bucket := domain.Bucket
	exists, err := minioClient.BucketExists(context.Background(), bucket)
	if err != nil {
		return nil, err
	}
	if !exists {
		err = minioClient.MakeBucket(context.Background(), bucket, minio.MakeBucketOptions{
			Region: "us-east-1",
		})
		if err != nil {
			// Several instances may initialise the bucket at the same time, so
			// losing that race is not a startup failure as long as the bucket
			// is there now.
			existsNow, checkErr := minioClient.BucketExists(context.Background(), bucket)
			if checkErr != nil || !existsNow {
				return nil, fmt.Errorf("make bucket: %w", err)
			}
		}
		err = minioClient.SetBucketPolicy(context.Background(), bucket, `{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Action": ["s3:GetObject"],
					"Effect": "Allow",
					"Principal": "*",
					"Resource": ["arn:aws:s3:::static-file/*"],
					"Sid": "PublicRead"
				}
			]
		}`)
		if err != nil {
			return nil, fmt.Errorf("set bucket policy: %w", err)
		}
	}
	return &MinioClient{Client: minioClient, config: config}, nil
}

// sign url
func (c *MinioClient) SignURL(ctx context.Context, bucket, object string, expires time.Duration) (string, error) {
	url, err := c.PresignedGetObject(ctx, bucket, object, expires, nil)
	if err != nil {
		return "", err
	}
	return url.String(), nil
}
