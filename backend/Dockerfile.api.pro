FROM --platform=$BUILDPLATFORM golang:1.24.3-alpine AS builder

WORKDIR /src
ENV CGO_ENABLED=0

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

ARG TARGETOS TARGETARCH VERSION
RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags "-s -w -extldflags '-static' -X github.com/chaitin/panda-wiki/telemetry.Version=${VERSION}" -o /build/panda-wiki-api pro/cmd/api_pro/main.go pro/cmd/api_pro/wire_gen.go \
    && GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags "-s -w -extldflags '-static' -X github.com/chaitin/panda-wiki/telemetry.Version=${VERSION}" -o /build/panda-wiki-migrate cmd/migrate/main.go cmd/migrate/wire_gen.go

FROM alpine:3.21 AS api

RUN apk update \
    && apk upgrade \
    && apk add --no-cache ca-certificates tzdata \
    && update-ca-certificates 2>/dev/null || true \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=builder /build/panda-wiki-api /app/panda-wiki-api
COPY --from=builder /build/panda-wiki-migrate /app/panda-wiki-migrate
COPY --from=builder /src/store/pg/migration /app/migration

CMD ["sh", "-c", "/app/panda-wiki-migrate && /app/panda-wiki-api"]
