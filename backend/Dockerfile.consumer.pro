FROM --platform=$BUILDPLATFORM golang:1.24.3-alpine AS builder

WORKDIR /src
ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

ARG TARGETOS TARGETARCH
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags "-s -w -extldflags '-static'" -o /build/panda-wiki-consumer pro/cmd/consumer_pro/main.go pro/cmd/consumer_pro/wire_gen.go

FROM alpine:3.21 AS consumer

RUN apk update \
    && apk upgrade \
    && apk add --no-cache ca-certificates tzdata \
    && update-ca-certificates 2>/dev/null || true \
    && rm -rf /var/cache/apk/*

# runtime 中 pg.go 使用编译时源码路径 /src/store/pg/migration，需在镜像中保留该路径
RUN mkdir -p /src/store/pg/migration

WORKDIR /app
COPY --from=builder /build/panda-wiki-consumer /app/panda-wiki-consumer
COPY --from=builder /src/store/pg/migration /app/migration
COPY --from=builder /src/store/pg/migration /src/store/pg/migration

CMD ["./panda-wiki-consumer"]
