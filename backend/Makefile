generate:
	swag fmt --dir handler && swag init --exclude pro -g cmd/api/main.go --pd \
	&& wire cmd/api/wire.go \
	&& wire cmd/consumer/wire.go \
	&& wire cmd/migrate/wire.go

generate_pro:
	wire cmd/migrate/wire.go \
	&& cd pro \
	&& swag fmt --dir handler && swag init --instanceName pro -g cmd/api_pro/main.go --pd \
	&& wire cmd/api_pro/wire.go \
	&& wire cmd/consumer_pro/wire.go

lint:generate generate_pro
	go mod tidy && golangci-lint run

SEQ_NAME=init
migrate_sql:
	migrate create -ext sql -dir store/pg/migration -seq ${SEQ_NAME}

image:
	docker buildx build \
	  --platform ${PLATFORM} \
	  --tag ${IMAGE_NAME} \
	  --build-arg VERSION=${VERSION} \
	  --output ${OUTPUT} \
	  --progress plain \
	  --file ${DOCKERFILE} \
	  .

# Single-arch build when buildx is not available (no --platform, use plain docker build).
# Usage: make image-single DOCKERFILE=Dockerfile.api IMAGE_NAME=your-registry/panda-wiki-api:tag VERSION=tag
image-single:
	docker build \
	  --tag ${IMAGE_NAME} \
	  --build-arg VERSION=${VERSION} \
	  --file ${DOCKERFILE} \
	  .

TAG=$(shell git describe --tags 2>/dev/null || echo "latest")
push-prod-images:
	make image PLATFORM=linux/amd64,linux/arm64 DOCKERFILE=Dockerfile.api IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-api:${TAG} OUTPUT=type=registry VERSION=${TAG} \
	&& make image PLATFORM=linux/amd64,linux/arm64 DOCKERFILE=Dockerfile.consumer IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-consumer:${TAG} OUTPUT=type=registry VERSION=${TAG}

# Push single-arch images when buildx is not available (e.g. "unknown flag: --platform").
# Builds for current machine arch only; then run: docker push <image> for each.
push-prod-images-single:
	make image-single DOCKERFILE=Dockerfile.api IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-api:${TAG} VERSION=${TAG} \
	&& make image-single DOCKERFILE=Dockerfile.consumer IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-consumer:${TAG} VERSION=${TAG}

COMMIT_HASH=$(shell git rev-parse --short HEAD)
LOCAL_PLATFORM=linux/$(shell uname -m)
#LOCAL_PLATFORM=linux/amd64
dev:generate
	make image PLATFORM=${LOCAL_PLATFORM} DOCKERFILE=Dockerfile.api IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-api:latest OUTPUT=type=docker VERSION=${COMMIT_HASH} \
	&& make image PLATFORM=${LOCAL_PLATFORM} DOCKERFILE=Dockerfile.consumer IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-consumer:latest OUTPUT=type=docker VERSION=${COMMIT_HASH} \
	&& cd deploy && docker compose up -d

pro:generate_pro
	make image PLATFORM=${LOCAL_PLATFORM} DOCKERFILE=Dockerfile.api.pro IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-api:latest OUTPUT=type=docker VERSION=${COMMIT_HASH} \
	&& make image PLATFORM=${LOCAL_PLATFORM} DOCKERFILE=Dockerfile.consumer.pro IMAGE_NAME=chaitin-registry.cn-hangzhou.cr.aliyuncs.com/chaitin/panda-wiki-consumer:latest OUTPUT=type=docker VERSION=${COMMIT_HASH} \
	&& cd deploy && docker compose up -d