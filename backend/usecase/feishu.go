package usecase

import (
	"context"
	"fmt"
	"sync"

	lark "github.com/larksuite/oapi-sdk-go/v3"
	larkcore "github.com/larksuite/oapi-sdk-go/v3/core"
	larkdrive1 "github.com/larksuite/oapi-sdk-go/v3/service/drive/v1"
	larkwiki1 "github.com/larksuite/oapi-sdk-go/v3/service/wiki/v1"
	larkwiki2 "github.com/larksuite/oapi-sdk-go/v3/service/wiki/v2"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type FeishuUseCase struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
}

func NewFeishuUseCase(logger *log.Logger, minio *s3.MinioClient) *FeishuUseCase {
	return &FeishuUseCase{
		logger:      logger.WithModule("usecase.feishuusecase"),
		minioClient: minio,
	}
}

func (f *FeishuUseCase) GetSpacelist(ctx context.Context, req *domain.GetSpaceListReq) ([]*domain.GetSpaceListResp, error) {
	client := lark.NewClient(req.AppID, req.AppSecret)
	var (
		respData  []*domain.GetSpaceListResp
		pageToken string
	)
	for {
		// 创建请求对象
		r := larkwiki2.NewListSpaceReqBuilder().
			PageSize(20).
			PageToken(pageToken).
			Lang(`zh`).
			Build()

		f.logger.Debug("token", log.String("token", req.UserAccessToken))
		// 发起请求
		resp, err := client.Wiki.V2.Space.List(
			ctx,
			r,
			larkcore.WithUserAccessToken(req.UserAccessToken))
		if err != nil {
			f.logger.Error("list space failed", log.Error(err))
			return nil, fmt.Errorf("list space failed: %v", err)
		}

		if resp.Msg != "success" {
			return nil, fmt.Errorf("list space failed: %s", resp.Msg)
		}
		f.logger.Debug("resp", log.Any("resp", resp))
		for _, v := range resp.Data.Items {
			respData = append(respData, &domain.GetSpaceListResp{
				Name:    *v.Name,
				SpaceId: *v.SpaceId,
			})
		}
		if !*resp.Data.HasMore {
			break
		}
		pageToken = *resp.Data.PageToken
	}
	return respData, nil
}

func (f *FeishuUseCase) SearchWiki(ctx context.Context, req *domain.SearchWikiReq) ([]*domain.SearchWikiResp, error) {
	client := lark.NewClient(req.AppID, req.AppSecret)
	var (
		pageToken string
		respData  []*domain.SearchWikiResp
	)
	for {
		// 创建请求对象
		r := larkwiki1.NewSearchNodeReqBuilder().
			PageSize(20).
			PageToken(pageToken).
			Body(larkwiki1.NewSearchNodeReqBodyBuilder().
				Query(req.Query).
				SpaceId(req.SpaceId).
				Build()).
			Build()

		f.logger.Debug("token", log.String("token", req.UserAccessToken))
		// 发起请求
		resp, err := client.Wiki.V1.Node.Search(ctx, r, larkcore.WithUserAccessToken(req.UserAccessToken))
		if err != nil {
			f.logger.Error("search Wiki failed", log.Error(err))
			return nil, fmt.Errorf("search Wiki failed: %v", err)
		}

		if resp.Msg != "success" {
			return nil, fmt.Errorf("search Wiki failed: %s", resp.Msg)
		}
		f.logger.Debug("resp", log.Any("resp", resp))
		for _, v := range resp.Data.Items {
			if *v.ObjType == 9 {
				continue
			}
			respData = append(respData, &domain.SearchWikiResp{
				Title:   *v.Title,
				Url:     *v.Url,
				SpaceId: *v.SpaceId,
			})
		}
		if !*resp.Data.HasMore {
			break
		}
		pageToken = *resp.Data.PageToken
	}
	return respData, nil
}

func (f *FeishuUseCase) GetDoc(ctx context.Context, req *domain.GetDocxReq) ([]*domain.GetDocxResp, error) {
	var respData []*domain.GetDocxResp
	for _, v := range req.Urls {
		title, content, err := utils.DownloadDocument(ctx, req.AppID, req.AppSecret, v, f.minioClient, req.KBID)
		if err != nil {
			f.logger.Error("download docx failed", log.Error(err))
			return nil, fmt.Errorf("download docx failed: %v", err)
		}
		respData = append(respData, &domain.GetDocxResp{
			Title:   title,
			Content: content,
		})
	}
	return respData, nil
}

func (f *FeishuUseCase) ListDocx(ctx context.Context, req *domain.SearchDocxReq) ([]*domain.SearchDocxResp, error) {
	client := lark.NewClient(req.AppID, req.AppSecret)

	// 使用context.WithCancel实现优雅退出
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	errChan := make(chan error, 1)                     // 缓冲通道防止goroutine泄漏
	dataChan := make(chan *domain.SearchDocxResp, 100) // 适当缓冲提高性能

	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		searchDocx(ctx, client, req.UserAccessToken, "", dataChan, errChan)
	}()

	// 单独goroutine等待所有搜索完成
	go func() {
		wg.Wait()
		close(dataChan)
		close(errChan)
	}()

	results := make([]*domain.SearchDocxResp, 0)

	// 处理结果和错误
	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case data, ok := <-dataChan:
			if !ok {
				return results, nil
			}
			results = append(results, data)
		case err, ok := <-errChan:
			if ok {
				return nil, err
			}
		}
	}
}

func searchDocx(ctx context.Context, client *lark.Client, accessToken, folderToken string,
	dataChan chan<- *domain.SearchDocxResp, errChan chan<- error,
) {
	// 构建请求
	builder := larkdrive1.NewListFileReqBuilder().
		OrderBy("EditedTime").
		Direction("DESC")

	if folderToken != "" {
		builder.FolderToken(folderToken)
	}

	// 发送请求
	resp, err := client.Drive.V1.File.List(
		ctx, // 使用传入的context
		builder.Build(),
		larkcore.WithUserAccessToken(accessToken),
	)
	if resp.Msg != "success" {
		select {
		case errChan <- fmt.Errorf("search doc failed: %s", resp.Msg):
		case <-ctx.Done():
		}
	}
	if err != nil {

		select {
		case errChan <- fmt.Errorf("search doc failed: %w", err):
		case <-ctx.Done():
		}
		return
	}

	var wg sync.WaitGroup

	for _, v := range resp.Data.Files {
		select {
		case <-ctx.Done():
			return
		default:
			if *v.Type == "folder" {
				wg.Add(1)
				go func(token string) {
					defer wg.Done()
					searchDocx(ctx, client, accessToken, token, dataChan, errChan)
				}(*v.Token)
			} else {
				select {
				case dataChan <- &domain.SearchDocxResp{
					Name: *v.Name,
					Url:  *v.Url,
				}:
				case <-ctx.Done():
				}
			}
		}
	}

	wg.Wait()
}
