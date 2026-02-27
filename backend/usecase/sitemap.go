package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/repo/pg"
)

type SitemapUsecase struct {
	nodeUsecase *pg.NodeRepository
	appUsecase  *pg.KnowledgeBaseRepository
	logger      *log.Logger
}

func NewSitemapUsecase(nodeUsecase *pg.NodeRepository, appUsecase *pg.KnowledgeBaseRepository, logger *log.Logger) *SitemapUsecase {
	return &SitemapUsecase{nodeUsecase: nodeUsecase, appUsecase: appUsecase, logger: logger.WithModule("usecase.sitemap")}
}

func (u *SitemapUsecase) GetSitemap(ctx context.Context, kbID string) (string, error) {
	nodes, err := u.nodeUsecase.GetNodeReleaseListByKBID(ctx, kbID, "")
	if err != nil {
		return "", fmt.Errorf("failed to get node release list: %w", err)
	}

	kb, err := u.appUsecase.GetKnowledgeBaseByID(ctx, kbID)
	if err != nil {
		return "", fmt.Errorf("failed to get knowledge base: %w", err)
	}

	sb := strings.Builder{}
	sb.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	sb.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)

	// add welcome
	sb.WriteString(fmt.Sprintf(`<url><loc>%s/welcome</loc><lastmod>%s</lastmod></url>`, kb.AccessSettings.BaseURL, time.Now().Format(time.DateOnly)))

	// add nodes
	for _, node := range nodes {
		if node.Type == domain.NodeTypeDocument {
			sb.WriteString(fmt.Sprintf(`<url><loc>%s</loc><lastmod>%s</lastmod></url>`, node.GetURL(kb.AccessSettings.BaseURL), node.UpdatedAt.Format(time.DateOnly)))
		}
	}

	sb.WriteString(`</urlset>`)

	return sb.String(), nil
}
