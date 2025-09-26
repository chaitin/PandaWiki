package usecase

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"

	v1 "github.com/chaitin/panda-wiki/api/crawler/v1"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/mq"
	"github.com/chaitin/panda-wiki/pkg/anydoc"
	"github.com/chaitin/panda-wiki/store/cache"
	"github.com/chaitin/panda-wiki/utils"
)

type CrawlerUsecase struct {
	logger       *log.Logger
	anydocClient *anydoc.Client
	httpClient   *http.Client
	cache        *cache.Cache
}

func NewCrawlerUsecase(logger *log.Logger, mqConsumer mq.MQConsumer, cache *cache.Cache) (*CrawlerUsecase, error) {
	anydocClient, err := anydoc.NewClient(logger, mqConsumer)
	if err != nil {
		return nil, err
	}
	return &CrawlerUsecase{
		logger:       logger,
		anydocClient: anydocClient,
		cache:        cache,
		httpClient: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true,
				},
			},
		},
	}, nil
}

func (u *CrawlerUsecase) ScrapeURL(ctx context.Context, targetURL, kbID string) (*v1.ScrapeResp, error) {
	if strings.HasPrefix(targetURL, "/static-file") {
		targetURL = "https://panda-wiki-nginx:8080" + targetURL
	}

	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	getUrlRes, err := u.anydocClient.GetUrlList(ctx, targetURL, id)
	if err != nil {
		return nil, err
	}

	if len(getUrlRes.Docs) == 0 {
		return nil, errors.New("get getUrlRes Docs failed")
	}

	urlExportRes, err := u.anydocClient.UrlExport(ctx, id, getUrlRes.Docs[0].Id, kbID)
	if err != nil {
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, urlExportRes.Data)
	if err != nil {
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		return nil, err
	}

	return &v1.ScrapeResp{
		Title:   getUrlRes.Docs[0].Title,
		Content: string(fileBytes),
	}, nil
}

func (u *CrawlerUsecase) ConfluenceParse(ctx context.Context, targetURL, filename string) (*v1.ConfluenceParseResp, error) {
	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	docs, err := u.anydocClient.ConfluenceListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	items := make([]v1.ConfluenceParseItem, 0, len(docs.Data.Docs))
	for _, doc := range docs.Data.Docs {
		items = append(items, v1.ConfluenceParseItem{
			ID:    doc.ID,
			Title: doc.Title,
			URL:   doc.URL,
		})
	}

	result := &v1.ConfluenceParseResp{
		ID:   id,
		Docs: items,
	}

	return result, nil
}

// ConfluenceScrape 根据文档ID列表抓取具体内容
func (u *CrawlerUsecase) ConfluenceScrape(ctx context.Context, req *v1.ConfluenceScrapeReq) (*v1.ConfluenceScrapeResp, error) {

	exportResp, err := u.anydocClient.ConfluenceExportDoc(ctx, req.ID, req.DocID, req.KbID)
	if err != nil {
		u.logger.Error("export confluence doc failed", "doc_id", req.DocID, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.ConfluenceScrapeResp{Content: string(fileBytes)}, nil
}

func (u *CrawlerUsecase) YuqueHandle(ctx context.Context, targetURL, filename, kbID string) ([]domain.YuqueResp, error) {

	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	yuqueListResp, err := u.anydocClient.YuqueListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	var results []domain.YuqueResp

	for _, doc := range yuqueListResp.Data.Docs {
		exportResp, err := u.anydocClient.YuqueExportDoc(ctx, id, doc.ID, kbID)
		if err != nil {
			u.logger.Error("export yuque doc failed", "doc_id", doc.ID, "error", err)
			continue
		}

		taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
		if err != nil {
			u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
			continue
		}

		fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
		if err != nil {
			u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
			continue
		}

		results = append(results, domain.YuqueResp{
			ID:      doc.ID,
			Title:   doc.Title,
			Content: string(fileBytes),
		})
	}
	return results, nil
}

func (u *CrawlerUsecase) WikijsHandle(ctx context.Context, targetURL, filename, kbID string) ([]v1.WikiJSResp, error) {

	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	wikijsListResp, err := u.anydocClient.WikijsListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	var results []v1.WikiJSResp

	for _, doc := range wikijsListResp.Data.Docs {
		exportResp, err := u.anydocClient.WikijsExportDoc(ctx, id, doc.ID, kbID)
		if err != nil {
			u.logger.Error("export doc failed", "doc_id", doc.ID, "error", err)
			continue
		}

		taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
		if err != nil {
			u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
			continue
		}

		fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
		if err != nil {
			u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
			continue
		}

		results = append(results, v1.WikiJSResp{
			ID:      doc.ID,
			Title:   doc.Title,
			Content: string(fileBytes),
		})
	}
	return results, nil
}

func (u *CrawlerUsecase) EpubHandle(ctx context.Context, targetURL, filename, kbID string) (*domain.EpubResp, error) {

	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	epubListResp, err := u.anydocClient.EpubpListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	if len(epubListResp.Data.Docs) != 1 {
		return nil, fmt.Errorf("get epubListResp.Data.Docs failed")
	}

	doc := epubListResp.Data.Docs[0]
	exportResp, err := u.anydocClient.EpubpExportDoc(ctx, id, doc.ID, kbID)
	if err != nil {
		u.logger.Error("export doc failed", "doc_id", doc.ID, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}
	if doc.Title == "" {
		doc.Title = taskRes.Markdown
	}

	result := &domain.EpubResp{
		ID:      doc.ID,
		Title:   doc.Title,
		Content: string(fileBytes),
	}
	return result, nil
}

func (u *CrawlerUsecase) NotionGetDocList(ctx context.Context, integration string) (*v1.NotionParseResp, error) {
	id := uuid.New().String()

	notionListResp, err := u.anydocClient.NotionListDocs(ctx, integration, id)
	if err != nil {
		return nil, err
	}

	var results []v1.NotionParseItem

	for _, doc := range notionListResp.Data.Docs {
		results = append(results, v1.NotionParseItem{
			ID:    doc.ID,
			Title: doc.Title,
		})
	}
	return &v1.NotionParseResp{
		ID:   id,
		Docs: results,
	}, nil
}

func (u *CrawlerUsecase) NotionGetDoc(ctx context.Context, req v1.NotionScrapeReq) ([]v1.NotionScrapeResp, error) {
	var results []v1.NotionScrapeResp

	exportResp, err := u.anydocClient.NotionExportDoc(ctx, req.ID, req.DocId, req.KbID)
	if err != nil {
		u.logger.Error("export doc failed", "doc_id", req.DocId, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	u.logger.Debug("taskRes:", "id", req.DocId, "file", string(fileBytes))

	results = append(results, v1.NotionScrapeResp{
		Content: string(fileBytes),
	})

	return results, nil
}

func (u *CrawlerUsecase) SitemapGetUrls(ctx context.Context, xmlUrl string) (*v1.SitemapParseResp, error) {

	id := uuid.New().String()

	res, err := u.anydocClient.SitemapListDocs(ctx, id, xmlUrl)
	if err != nil {
		return nil, err
	}
	var items []v1.SitemapParseItem
	for _, doc := range res.Data.Docs {
		items = append(items, v1.SitemapParseItem{
			URL:   doc.Id,
			Title: doc.Title,
		})
	}

	resp := &v1.SitemapParseResp{
		ID:   id,
		List: items,
	}

	return resp, nil
}

func (u *CrawlerUsecase) SitemapGetDoc(ctx context.Context, req *v1.SitemapScrapeReq) (*v1.SitemapScrapeResp, error) {

	urlExportRes, err := u.anydocClient.SitemapExportDoc(ctx, req.ID, req.URL, req.KbID)
	if err != nil {
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, urlExportRes.Data)
	if err != nil {
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		return nil, err
	}

	return &v1.SitemapScrapeResp{
		Content: string(fileBytes),
	}, nil
}

func (u *CrawlerUsecase) GetRSSParse(ctx context.Context, req *v1.RssParseReq) (*v1.RssParseResp, error) {

	id := uuid.New().String()

	res, err := u.anydocClient.RssListDocs(ctx, id, req.URL)
	if err != nil {
		return nil, err
	}
	var items []v1.RssParseItem
	for _, doc := range res.Data.Docs {
		items = append(items, v1.RssParseItem{
			URL:   doc.Id,
			Title: doc.Title,
			Desc:  doc.Summary,
		})
	}

	return &v1.RssParseResp{
		ID:   id,
		List: items,
	}, nil
}

func (u *CrawlerUsecase) GetRssDoc(ctx context.Context, req *v1.RssScrapeReq) (*v1.RssScrapeResp, error) {

	urlExportRes, err := u.anydocClient.RssExportDoc(ctx, req.ID, req.URL, req.KbID)
	if err != nil {
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, urlExportRes.Data)
	if err != nil {
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		return nil, err
	}

	return &v1.RssScrapeResp{
		Content: string(fileBytes),
	}, nil
}

func (u *CrawlerUsecase) SiyuanParse(ctx context.Context, targetURL, filename string) (*v1.SiyuanParseResp, error) {
	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	docs, err := u.anydocClient.SiyuanListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	items := make([]v1.SiyuanParseItem, 0, len(docs.Data.Docs))
	for _, doc := range docs.Data.Docs {
		items = append(items, v1.SiyuanParseItem{
			ID:    doc.ID,
			Title: doc.Title,
			URL:   doc.URL,
		})
	}

	result := &v1.SiyuanParseResp{
		ID:   id,
		Docs: items,
	}

	return result, nil
}

// SiyuanScrape 根据文档ID列表抓取具体内容
func (u *CrawlerUsecase) SiyuanScrape(ctx context.Context, req *v1.SiyuanScrapeReq) (*v1.SiyuanScrapeResp, error) {

	exportResp, err := u.anydocClient.SiyuanExportDoc(ctx, req.ID, req.DocID, req.KbID)
	if err != nil {
		u.logger.Error("export Siyuan doc failed", "doc_id", req.DocID, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.SiyuanScrapeResp{Content: string(fileBytes)}, nil
}

func (u *CrawlerUsecase) MindocParse(ctx context.Context, targetURL, filename string) (*v1.MindocParseResp, error) {
	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	docs, err := u.anydocClient.MindocListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	items := make([]v1.MindocParseItem, 0, len(docs.Data.Docs))
	for _, doc := range docs.Data.Docs {
		items = append(items, v1.MindocParseItem{
			ID:    doc.ID,
			Title: doc.Title,
			URL:   doc.URL,
		})
	}

	result := &v1.MindocParseResp{
		ID:   id,
		Docs: items,
	}

	return result, nil
}

// MindocScrape 根据文档ID列表抓取具体内容
func (u *CrawlerUsecase) MindocScrape(ctx context.Context, req *v1.MindocScrapeReq) (*v1.MindocScrapeResp, error) {

	exportResp, err := u.anydocClient.MindocExportDoc(ctx, req.ID, req.DocID, req.KbID)
	if err != nil {
		u.logger.Error("export Mindoc doc failed", "doc_id", req.DocID, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.MindocScrapeResp{Content: string(fileBytes)}, nil
}
