package usecase

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"slices"

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

func (u *CrawlerUsecase) ParseUrl(ctx context.Context, req *v1.CrawlerParseReq) (*v1.CrawlerParseResp, error) {
	id := utils.GetFileNameWithoutExt(req.Key)
	if !utils.IsUUID(id) {
		id = uuid.New().String()
	}

	// 文件类型的解析会先走上传接口
	if req.CrawlerSource.Type() == consts.CrawlerSourceTypeFile {
		req.Key = fmt.Sprintf("http://panda-wiki-minio:9000/static-file/%s", req.Key)
	}

	var (
		docs *anydoc.ListDocResponse
		err  error
	)
	switch req.CrawlerSource {

	case consts.CrawlerSourceFeishu:
		docs, err = u.anydocClient.FeishuListDocs(ctx, id, req.FeishuSetting.AppID, req.FeishuSetting.AppSecret, req.FeishuSetting.UserAccessToken, req.FeishuSetting.SpaceId)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceUrl, consts.CrawlerSourceFile:
		docs, err = u.anydocClient.GetUrlList(ctx, req.Key, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceConfluence:
		docs, err = u.anydocClient.ConfluenceListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}
	case consts.CrawlerSourceEpub:
		docs, err = u.anydocClient.EpubpListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}
	case consts.CrawlerSourceMindoc:
		docs, err = u.anydocClient.MindocListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}
	case consts.CrawlerSourceWikijs:
		docs, err = u.anydocClient.WikijsListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceSiyuan:
		docs, err = u.anydocClient.SiyuanListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceYuque:
		docs, err = u.anydocClient.YuqueListDocs(ctx, req.Key, req.Filename, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceSitemap:
		docs, err = u.anydocClient.SitemapListDocs(ctx, req.Key, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceRSS:
		docs, err = u.anydocClient.RssListDocs(ctx, req.Key, id)
		if err != nil {
			return nil, err
		}

	case consts.CrawlerSourceNotion:
		docs, err = u.anydocClient.NotionListDocs(ctx, req.Key, id)
		if err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("parse type %s is not supported", req.CrawlerSource)
	}

	result := &v1.CrawlerParseResp{
		ID:   id,
		Docs: docs.Data.Docs,
	}

	return result, nil
}

func (u *CrawlerUsecase) ExportDoc(ctx context.Context, req *v1.CrawlerExportReq) (*v1.CrawlerExportResp, error) {
	urlExportRes, err := u.anydocClient.UrlExport(ctx, req.ID, req.DocID, req.KbID)
	if err != nil {
		return nil, err
	}

	return &v1.CrawlerExportResp{
		TaskId: urlExportRes.Data,
	}, nil
}

func (u *CrawlerUsecase) ScrapeGetResult(ctx context.Context, taskId string) (*v1.CrawlerResultResp, error) {
	taskRes, err := u.anydocClient.TaskList(ctx, []string{taskId})
	if err != nil {
		return nil, err
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
		fileBytes, err := u.anydocClient.DownloadDoc(ctx, taskRes.Data[0].Markdown)
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
	for i, data := range taskRes.Data {
		if slices.Contains([]anydoc.Status{anydoc.StatusPending, anydoc.StatusInProgress}, taskRes.Data[i].Status) {
			status = consts.CrawlerStatusPending
		}

		fileBytes, err := u.anydocClient.DownloadDoc(ctx, data.Markdown)
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
