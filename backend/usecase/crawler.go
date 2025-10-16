package usecase

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/google/uuid"

	v1 "github.com/chaitin/panda-wiki/api/crawler/v1"
	"github.com/chaitin/panda-wiki/consts"
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

	return &v1.ScrapeResp{
		TaskId: urlExportRes.Data,
		Title:  getUrlRes.Docs[0].Title,
	}, nil
}

func (u *CrawlerUsecase) ScrapeGetResult(ctx context.Context, taskId string) (*v1.CrawlerResultResp, error) {
	taskRes, err := u.anydocClient.TaskList(ctx, []string{taskId})
	if err != nil {
		return nil, err
	}
	
	// Get document title for filename
	urlList, err := u.anydocClient.GetUrlList(ctx, "", taskId)
	var docTitle string
	if err == nil && len(urlList.Docs) > 0 {
		docTitle = urlList.Docs[0].Title
	}
	
	switch taskRes.Data[0].Status {
	case anydoc.StatusPending, anydoc.StatusInProgress:
		return &v1.CrawlerResultResp{
			Status: consts.CrawlerStatusPending,
		}, nil

	case anydoc.StatusFailed:
		return &v1.CrawlerResultResp{
			Status: consts.CrawlerStatusFailed,
		}, fmt.Errorf("file crawl failed: %s", taskRes.Data[0].Err)

	case anydoc.StatusCompleted:
		var fileBytes []byte
		if docTitle != "" {
			fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Data[0].Markdown, docTitle)
		} else {
			fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Data[0].Markdown)
		}
		if err != nil {
			return nil, err
		}
		return &v1.CrawlerResultResp{
			Status:  consts.CrawlerStatusCompleted,
			Content: string(fileBytes),
		}, nil

	default:
		return nil, fmt.Errorf("unsupported task status : %s", taskRes.Data[0].Status)
	}
}

func (u *CrawlerUsecase) ScrapeGetResults(ctx context.Context, taskIds []string) (*v1.CrawlerResultsResp, error) {
	taskRes, err := u.anydocClient.TaskList(ctx, taskIds)
	if err != nil {
		return nil, err
	}

	list := make([]v1.CrawlerResultItem, 0)
	status := consts.CrawlerStatusCompleted
	
	// Get document titles for filenames
	urlLists := make(map[string]*anydoc.GetUrlListData)
	for _, taskId := range taskIds {
		if urlList, err := u.anydocClient.GetUrlList(ctx, "", taskId); err == nil {
			urlLists[taskId] = urlList
		}
	}
	
	for i, data := range taskRes.Data {
		if slices.Contains([]anydoc.Status{anydoc.StatusPending, anydoc.StatusInProgress}, taskRes.Data[i].Status) {
			status = consts.CrawlerStatusPending
		}

		var fileBytes []byte
		// Try to get document title for filename
		var docTitle string
		if urlList, exists := urlLists[data.TaskId]; exists && len(urlList.Docs) > 0 {
			docTitle = urlList.Docs[0].Title
		}
		
		if docTitle != "" {
			fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, data.Markdown, docTitle)
		} else {
			fileBytes, err = u.anydocClient.DownloadDoc(ctx, data.Markdown)
		}
		if err != nil {
			return nil, err
		}
		list = append(list, v1.CrawlerResultItem{
			TaskId:  taskRes.Data[i].TaskId,
			Status:  consts.CrawlerStatus(taskRes.Data[i].Status),
			Content: string(fileBytes),
		})
	}

	return &v1.CrawlerResultsResp{
		Status: status,
		List:   list,
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

	// Get document title for filename
	docs, err := u.anydocClient.ConfluenceListDocs(ctx, "", "", req.ID)
	var docTitle string
	if err == nil {
		for _, doc := range docs.Data.Docs {
			if doc.ID == req.DocID {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.ConfluenceScrapeResp{Content: string(fileBytes)}, nil
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

func (u *CrawlerUsecase) NotionGetDoc(ctx context.Context, req v1.NotionScrapeReq) (*v1.NotionScrapeResp, error) {

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

	// Get document title for filename
	notionListResp, err := u.anydocClient.NotionListDocs(ctx, "", req.ID)
	var docTitle string
	if err == nil {
		for _, doc := range notionListResp.Data.Docs {
			if doc.ID == req.DocId {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	u.logger.Debug("taskRes:", "id", req.DocId, "file", string(fileBytes))

	return &v1.NotionScrapeResp{
		Content: string(fileBytes),
	}, nil
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

	// Get document title for filename
	sitemapListResp, err := u.anydocClient.SitemapListDocs(ctx, req.ID, "")
	var docTitle string
	if err == nil && len(sitemapListResp.Data.Docs) > 0 {
		// Find matching document by URL
		for _, doc := range sitemapListResp.Data.Docs {
			if doc.Id == req.URL {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
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

	// Get document title for filename
	rssListResp, err := u.anydocClient.RssListDocs(ctx, req.ID, req.URL)
	var docTitle string
	if err == nil && len(rssListResp.Data.Docs) > 0 {
		// Find matching document by URL
		for _, doc := range rssListResp.Data.Docs {
			if doc.Id == req.URL {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
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

	// Get document title for filename
	docs, err := u.anydocClient.SiyuanListDocs(ctx, "", "", req.ID)
	var docTitle string
	if err == nil {
		for _, doc := range docs.Data.Docs {
			if doc.ID == req.DocID {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
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

	// Get document title for filename
	docs, err := u.anydocClient.MindocListDocs(ctx, "", "", req.ID)
	var docTitle string
	if err == nil {
		for _, doc := range docs.Data.Docs {
			if doc.ID == req.DocID {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.MindocScrapeResp{Content: string(fileBytes)}, nil
}

func (u *CrawlerUsecase) WikijsParse(ctx context.Context, targetURL, filename string) (*v1.WikijsParseResp, error) {
	id := utils.GetFileNameWithoutExt(targetURL)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	docs, err := u.anydocClient.WikijsListDocs(ctx, targetURL, filename, id)
	if err != nil {
		return nil, err
	}

	items := make([]v1.WikijsParseItem, 0, len(docs.Data.Docs))
	for _, doc := range docs.Data.Docs {
		items = append(items, v1.WikijsParseItem{
			ID:    doc.ID,
			Title: doc.Title,
		})
	}

	result := &v1.WikijsParseResp{
		ID:   id,
		Docs: items,
	}

	return result, nil
}

func (u *CrawlerUsecase) WikijsScrape(ctx context.Context, req *v1.WikijsScrapeReq) (*v1.WikijsScrapeResp, error) {

	exportResp, err := u.anydocClient.WikijsExportDoc(ctx, req.ID, req.DocID, req.KbID)
	if err != nil {
		u.logger.Error("export Wikijs doc failed", "doc_id", req.DocID, "error", err)
		return nil, err
	}

	taskRes, err := u.anydocClient.TaskWaitForCompletion(ctx, exportResp.Data)
	if err != nil {
		u.logger.Error("wait for task completion failed", "task_id", exportResp.Data, "error", err)
		return nil, err
	}

	// Get document title for filename
	docs, err := u.anydocClient.WikijsListDocs(ctx, "", "", req.ID)
	var docTitle string
	if err == nil {
		for _, doc := range docs.Data.Docs {
			if doc.ID == req.DocID {
				docTitle = doc.Title
				break
			}
		}
	}
	
	var fileBytes []byte
	if docTitle != "" {
		fileBytes, err = u.anydocClient.DownloadDocWithName(ctx, taskRes.Markdown, docTitle)
	} else {
		fileBytes, err = u.anydocClient.DownloadDoc(ctx, taskRes.Markdown)
	}
	if err != nil {
		u.logger.Error("download doc failed", "markdown_path", taskRes.Markdown, "error", err)
		return nil, err
	}

	return &v1.WikijsScrapeResp{Content: string(fileBytes)}, nil
}

func (u *CrawlerUsecase) EpubParse(ctx context.Context, req *v1.EpubParseReq) (*v1.EpubParseResp, error) {
	url := fmt.Sprintf("http://panda-wiki-minio:9000/static-file/%s", req.Key)

	id := utils.GetFileNameWithoutExt(url)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	epubListResp, err := u.anydocClient.EpubpListDocs(ctx, url, req.Filename, id)
	if err != nil {
		return nil, err
	}

	if len(epubListResp.Data.Docs) != 1 {
		return nil, fmt.Errorf("get epubListResp.Data.Docs failed")
	}

	doc := epubListResp.Data.Docs[0]
	exportResp, err := u.anydocClient.EpubpExportDoc(ctx, id, doc.ID, req.KbID)
	if err != nil {
		u.logger.Error("export doc failed", "doc_id", doc.ID, "error", err)
		return nil, err
	}

	return &v1.EpubParseResp{
		TaskID: exportResp.Data,
	}, nil
}

func (u *CrawlerUsecase) YuqueParse(ctx context.Context, req *v1.YuqueParseReq) (*v1.YuqueParseResp, error) {
	url := fmt.Sprintf("http://panda-wiki-minio:9000/static-file/%s", req.Key)

	id := utils.GetFileNameWithoutExt(url)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	yuqueListResp, err := u.anydocClient.YuqueListDocs(ctx, url, req.Filename, id)
	if err != nil {
		return nil, err
	}

	var results []v1.YuqueParseItem

	for _, doc := range yuqueListResp.Data.Docs {
		exportResp, err := u.anydocClient.YuqueExportDoc(ctx, id, doc.ID, req.KbID)
		if err != nil {
			u.logger.Error("export yuque doc failed", "doc_id", doc.ID, "error", err)
			continue
		}
		results = append(results, v1.YuqueParseItem{
			TaskID: exportResp.Data,
			Title:  doc.Title,
		})
	}
	return &v1.YuqueParseResp{List: results}, nil
}
