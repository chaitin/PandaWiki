package usecase

import (
	"context"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/88250/lute"
	"github.com/Wsine/feishu2md/core"
	fershu2mdUtil "github.com/Wsine/feishu2md/utils"
	"github.com/google/uuid"
	lark "github.com/larksuite/oapi-sdk-go/v3"
	larkcore "github.com/larksuite/oapi-sdk-go/v3/core"
	larkbitable "github.com/larksuite/oapi-sdk-go/v3/service/bitable/v1"
	larkdrive1 "github.com/larksuite/oapi-sdk-go/v3/service/drive/v1"
	larksheets "github.com/larksuite/oapi-sdk-go/v3/service/sheets/v3"
	larkwiki2 "github.com/larksuite/oapi-sdk-go/v3/service/wiki/v2"
	"github.com/minio/minio-go/v7"
	"github.com/samber/lo"
	"github.com/samber/lo/parallel"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/utils"
)

type FeishuUseCase struct {
	logger      *log.Logger
	minioClient *s3.MinioClient
	crawler     *CrawlerUsecase
}

func NewFeishuUseCase(logger *log.Logger, minio *s3.MinioClient, crawler *CrawlerUsecase) *FeishuUseCase {
	return &FeishuUseCase{
		logger:      logger.WithModule("usecase.feishuusecase"),
		minioClient: minio,
		crawler:     crawler,
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
		resp, err := client.Wiki.Space.List(
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

func (f *FeishuUseCase) dfs(ctx context.Context, c *lark.Client, parentToken, spaceId, userAccessToken string, resultChan chan<- *domain.SearchWikiTemp) error {
	result, err := f.searchWiki(ctx, c, spaceId, parentToken, userAccessToken)
	if err != nil {
		return err
	}
	wg := sync.WaitGroup{}
	// 启动一个协程来处理每个文档
	for _, doc := range result {
		wg.Add(1)
		go func(d *domain.SearchWikiTemp) {
			defer wg.Done() // 确保协程结束时计数减一
			if d.HasChild {
				// 递归调用 dfs
				if err := f.dfs(ctx, c, d.NodeToken, spaceId, userAccessToken, resultChan); err != nil {
					f.logger.Error("dfs failed", log.Error(err))
				}
			}
			// 将结果发送到通道
			resultChan <- d
		}(doc)
	}
	wg.Wait()

	return nil
}

func (f *FeishuUseCase) SearchWiki(ctx context.Context, req *domain.SearchWikiReq) ([]*domain.SearchWikiResp, error) {
	client := lark.NewClient(req.AppID, req.AppSecret)
	results := make([]*domain.SearchWikiResp, 0) // 初始化结果数组

	// 创建一个通道来收集结果
	resultChan := make(chan *domain.SearchWikiTemp)

	// 启动一个协程来处理根节点
	go func() {
		if err := f.dfs(ctx, client, "", req.SpaceId, req.UserAccessToken, resultChan); err != nil {
			f.logger.Error("dfs failed", log.Error(err))
		}
		close(resultChan) // 关闭通道
	}()

	// 从通道中收集结果
	for doc := range resultChan {
		results = append(results, &domain.SearchWikiResp{
			Title:    doc.Title,
			SpaceId:  doc.SpaceId,
			ObjToken: doc.ObjToken,
			ObjType:  doc.ObjType,
			Url:      doc.Url,
		})
	}
	return results, nil
}

func (f *FeishuUseCase) searchWiki(ctx context.Context, client *lark.Client, spaceId, parentToken, userAccessToken string) ([]*domain.SearchWikiTemp, error) {
	var (
		pageToken string
		respData  []*domain.SearchWikiTemp
	)
	for {
		// 创建请求对象

		r := larkwiki2.NewListSpaceNodeReqBuilder().
			SpaceId(spaceId).
			ParentNodeToken(parentToken).
			PageToken(pageToken).
			Build()
		if parentToken == "" {
			r = larkwiki2.NewListSpaceNodeReqBuilder().
				SpaceId(spaceId).
				PageToken(pageToken).
				Build()
		}
		resp, err := client.Wiki.SpaceNode.List(ctx, r, larkcore.WithUserAccessToken(userAccessToken))
		if err != nil || resp.Msg != "success" {
			return nil, fmt.Errorf("search Wiki failed: %v", err)
		}
		for _, v := range resp.Data.Items {
			var objType int
			switch *v.ObjType {
			case "docx":
				objType = 8
			case "file":
				objType = 5
			case "sheet":
				objType = 2
			case "bitable":
				objType = 3
			case "folder":
				objType = 9
			default:
				objType = 0
			}
			if objType == 9 {
				continue
			}
			respData = append(respData, &domain.SearchWikiTemp{
				Title:     *v.Title,
				SpaceId:   *v.SpaceId,
				ObjToken:  *v.ObjToken,
				NodeToken: *v.NodeToken,
				ObjType:   objType,
				Url:       *v.OriginNodeToken,
				HasChild:  *v.HasChild,
			})
		}

		pageToken = *resp.Data.PageToken
		if !*resp.Data.HasMore {
			break
		}
	}
	return respData, nil
}

func (f *FeishuUseCase) GetDoc(ctx context.Context, req *domain.GetDocxReq) ([]*domain.GetDocxResp, error) {
	results := parallel.Map(req.Sources, func(source domain.Source, _ int) *domain.GetDocxResp {
		var (
			title   string
			content string
			err     error
		)
		switch source.ObjType {
		case 8: // docx
			f.logger.Info("download [type 8] docx ", log.String("url", source.Url), log.String("token", source.ObjToken))
			title, content, err = f.downloadDocument(ctx, req.AppID, req.AppSecret, source.Url, req.KBID)
			if err != nil {
				f.logger.Error("download [type 8] docx failed", log.Error(err))
				return nil // 返回 nil 表示失败
			}
		case 5: // file
			f.logger.Info("download [type 5]file ", log.String("url", source.Url), log.String("token", source.ObjToken))
			title, content, err = f.downloadFile(ctx, req.AppID, req.AppSecret, source.ObjToken, req.KBID, req.UserAccessToken)
			if err != nil {
				f.logger.Error("download [type 5]file failed", log.Error(err))
				return nil // 返回 nil 表示失败
			}
		case 2, 3: // sheet
			f.logger.Info("download [type 2] sheet", log.String("url", source.Url), log.String("token", source.ObjToken))
			title, content, err = f.downloadSheet(ctx, source.ObjType, req.AppID, req.AppSecret, source.ObjToken, req.UserAccessToken, req.KBID)
			if err != nil {
				f.logger.Error("download [type 2] sheet failed", log.Error(err))
				return nil // 返回 nil 表示失败
			}
		default: // 其他类型
			f.logger.Error("unsupported obj type", log.Int("type", source.ObjType))
			return nil // 返回 nil 表示失败
		}

		return &domain.GetDocxResp{
			Title:   title,
			Content: content,
		}
	})

	// 过滤掉 nil（失败的情况）
	successResults := lo.Filter(results, func(resp *domain.GetDocxResp, _ int) bool {
		return resp != nil
	})

	// 如果有失败的请求，返回错误
	if len(successResults) < len(req.Sources) {
		return successResults, fmt.Errorf("some downloads failed (%d/%d succeeded)", len(successResults), len(req.Sources))
	}
	return successResults, nil
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
	resp, err := client.Drive.File.List(
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
				var temp int
				switch *v.Type {
				case "doc", "docx":
					temp = 8
				case "sheet":
					temp = 2
				case "bitable":
					temp = 3
				case "file":
					temp = 5
				case "folder":
					temp = 9
				default:
					temp = 0
				}
				select {
				case dataChan <- &domain.SearchDocxResp{
					Name:     *v.Name,
					Url:      *v.Url,
					ObjToken: *v.Token,
					ObjType:  temp,
				}:
				case <-ctx.Done():
				}
			}
		}
	}

	wg.Wait()
}

func (f *FeishuUseCase) downloadDocument(ctx context.Context, appID, secret, url, kbID string) (string, string, error) {
	client := core.NewClient(
		appID, secret,
	)
	if !strings.HasPrefix(url, "http") {
		url = "https://.feishu.cn/wiki/" + url
	}
	// Validate the url to download
	var dlConfig core.Config
	dlConfig.Output = core.OutputConfig{
		ImageDir:        "./temp/images",
		SkipImgDownload: false,
		TitleAsFilename: false,
		UseHTMLTags:     true,
	}
	// 清理图像临时存储目录
	defer func() {
		if err := os.RemoveAll(dlConfig.Output.ImageDir); err != nil {
			f.logger.Error("清理图像临时存储目录失败", log.Error(err))
		}
	}()
	docType, docToken, err := fershu2mdUtil.ValidateDocumentURL(url)
	if err != nil {
		return "", "", err
	}
	if docType == "wiki" {
		node, err := client.GetWikiNodeInfo(ctx, docToken)
		if err != nil {
			return "", "", fmt.Errorf("GetWikiNodeInfo err: %v for %v", err, url)
		}
		docToken = node.ObjToken
	}

	// Process the download
	docx, blocks, err := client.GetDocxContent(ctx, docToken)
	if err != nil {
		return "", "", err
	}

	parser := core.NewParser(dlConfig.Output)

	title := docx.Title
	if title == "" {
		title = "未命名文档"
	}
	markdown := parser.ParseDocxContent(docx, blocks)
	type imgReplace struct {
		token string
		path  string
	}

	replaceChan := make(chan imgReplace, len(parser.ImgTokens))
	errChan := make(chan error, len(parser.ImgTokens))
	var wg sync.WaitGroup
	for _, imgToken := range parser.ImgTokens {
		wg.Add(1)
		go func(token string) {
			defer wg.Done()

			localLink, err := client.DownloadImage(ctx, token, dlConfig.Output.ImageDir)
			if err != nil {
				errChan <- fmt.Errorf("下载图片失败: %v", err)
				return
			}

			osspath, err := utils.UploadImage(ctx, f.minioClient, localLink, kbID)
			if err != nil {
				errChan <- fmt.Errorf("上传图片失败: %v", err)
				return
			}

			replaceChan <- imgReplace{token: token, path: osspath}
		}(imgToken)
	}
	go func() {
		wg.Wait()
		close(replaceChan)
		close(errChan)
	}()

	// 检查错误
	select {
	case err := <-errChan:
		return "", "", err
	default:
	}
	replaces := make(map[string]string)
	for r := range replaceChan {
		replaces[r.token] = r.path
	}
	replacePairs := make([]string, 0, len(replaces)*2)
	for token, path := range replaces {
		replacePairs = append(replacePairs, token, path)
	}

	// 创建一次性替换器
	replacer := strings.NewReplacer(replacePairs...)
	markdown = replacer.Replace(markdown)

	// Format the markdown document
	engine := lute.New(func(l *lute.Lute) {
		l.RenderOptions.AutoSpace = true
	})
	result := engine.FormatStr("md", markdown)
	return title, result, nil
}

func (f *FeishuUseCase) downloadFile(ctx context.Context, appID, secret, fileToken, kbID, userAccessToken string) (string, string, error) {
	client := lark.NewClient(
		appID, secret,
	)

	req := larkdrive1.NewDownloadFileReqBuilder().
		FileToken(fileToken).
		Build()

	// 发起请求
	resp, err := client.Drive.File.Download(ctx, req, larkcore.WithUserAccessToken(userAccessToken))
	// 处理错误
	if err != nil {
		return "", "", err
	}

	// 服务端错误处理
	if !resp.Success() {
		return "", "", fmt.Errorf("下载文件失败: %s", resp.Msg)
	}

	// 业务处理
	ext := strings.ToLower(filepath.Ext(resp.FileName))
	contentType := mime.TypeByExtension(ext)
	if contentType == "" { // 如果没有找到合适的MIME类型，使用默认的二进制流
		contentType = "application/octet-stream"
	}
	imgName := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), ext)

	_, err = f.minioClient.PutObject(
		ctx,
		domain.Bucket,
		imgName,
		resp.File,
		-1,
		minio.PutObjectOptions{
			ContentType: contentType,
			UserMetadata: map[string]string{
				"originalname": resp.FileName,
			},
		},
	)
	if err != nil {
		return "", "", fmt.Errorf("上传文件到OSS失败: %s", err)
	}
	ossPath := fmt.Sprintf("/%s/%s", domain.Bucket, imgName)
	res, err := f.crawler.ScrapeURL(ctx, ossPath, kbID)
	if err != nil {
		return "", "", err
	}
	name := resp.FileName
	if name == "" {
		name = res.Title
	}
	if name == "" {
		name = "未命名文件"
	}
	return name, res.Content, nil
}

func getSheetTitle(ctx context.Context, appID, secret, sheetToken, usserAccessToken string) (string, error) {
	client := lark.NewClient(appID, secret)
	// 创建请求对象
	req := larksheets.NewGetSpreadsheetReqBuilder().
		SpreadsheetToken(sheetToken).
		Build()

	// 发起请求
	resp, err := client.Sheets.Spreadsheet.Get(ctx, req, larkcore.WithUserAccessToken(usserAccessToken))
	if err != nil {
		return "", err
	}
	return *resp.Data.Spreadsheet.Title, nil
}

func getAppTitle(ctx context.Context, appID, secret, appToken, usserAccessToken string) (string, error) {
	client := lark.NewClient(appID, secret)
	// 创建请求对象
	req := larkbitable.NewGetAppReqBuilder().
		AppToken(appToken).
		Build()

	// 发起请求
	resp, err := client.Bitable.App.Get(context.Background(), req, larkcore.WithUserAccessToken(usserAccessToken))
	if err != nil {
		return "", err
	}
	return *resp.Data.App.Name, nil
}

func (f *FeishuUseCase) getAppTables(ctx context.Context, appID, secret, appTableToken, usserAccessToken string) ([]*larkbitable.AppTable, error) {
	client := lark.NewClient(appID, secret)
	var results []*larkbitable.AppTable
	var pageToken string
	for {
		req := larkbitable.NewListAppTableReqBuilder().
			AppToken(appTableToken).
			PageSize(20).
			PageToken(pageToken).
			Build()

		// 发起请求
		resp, err := client.Bitable.AppTable.List(context.Background(), req, larkcore.WithUserAccessToken(usserAccessToken))
		if err != nil {
			return nil, err
		}
		results = append(results, resp.Data.Items...)
		if !*resp.Data.HasMore {
			break
		}
		pageToken = *resp.Data.PageToken
	}
	return results, nil
}

func (f *FeishuUseCase) downloadSheet(ctx context.Context, objType int, appID, secret, sheetToken, usserAccessToken, kbID string) (string, string, error) {
	var subIDs []string
	switch objType {
	case 2:
		sheets, err := f.getSheets(ctx, appID, secret, sheetToken, usserAccessToken)
		if err != nil {
			f.logger.Error("get sheets failed", log.Error(err))
			return "", "", err
		}
		subIDs = []string{*sheets[0].SheetId}
	case 3:
		tables, err := f.getAppTables(ctx, appID, secret, sheetToken, usserAccessToken)
		if err != nil {
			f.logger.Error("get app tables failed", log.Error(err))
			return "", "", err
		}
		subIDs = []string{*tables[0].TableId}
	default:
		return "", "", fmt.Errorf("unsupported obj type: %d", objType)
	}

	tickits, err := f.creatExportTask(ctx, objType, appID, secret, sheetToken, usserAccessToken, subIDs)
	if err != nil {
		f.logger.Error("export task failed", log.Error(err))
		return "", "", err
	}
	for i, tickit := range tickits {
		f.logger.Debug("Export task details",
			log.Int("index", i),
			log.String("ticket", tickit))
	}

	getExportTaskResps := parallel.Map(tickits, func(tickit string, _ int) *getExportTaskResp {
		ticker := time.NewTicker(10 * time.Millisecond)
		for {
			select {
			case <-ticker.C:
				res, err := f.getExportTask(ctx, appID, secret, tickit, sheetToken, usserAccessToken)
				if err != nil {
					f.logger.Error("get export task failed", log.Error(err))
					return nil
				}
				if res.FileName != "" && res.FileToken != "" {
					ticker.Stop()
					return res
				}
			case <-ctx.Done():
				ticker.Stop()
				return nil
			case <-time.After(3 * time.Second):
				ticker.Stop()
				f.logger.Error("get export task timeout", log.String("ticket", tickit))
				return nil
			}
		}
	})

	successResults := lo.Filter(getExportTaskResps, func(resp *getExportTaskResp, _ int) bool {
		return resp != nil
	})
	if len(successResults) < len(tickits) {
		return "", "", fmt.Errorf("some getExportTask failed (%d/%d succeeded)", len(successResults), len(tickits))
	}

	for i, resp := range successResults {
		f.logger.Debug("Download file info",
			log.Int("index", i),
			log.String("fileName", resp.FileName),
			log.String("fileToken", resp.FileToken))
	}

	res := parallel.Map(successResults, func(resp *getExportTaskResp, _ int) *domain.ScrapeResp {
		fileName, file, err := f.downloadExportTask(ctx, appID, secret, resp.FileToken, usserAccessToken)
		if err != nil {
			f.logger.Error("download export task failed", log.Error(err))
			return nil
		}

		imgName := fmt.Sprintf("%s/%s%s", kbID, uuid.New().String(), strings.ToLower(filepath.Ext(fileName)))
		_, err = f.minioClient.PutObject(
			ctx,
			domain.Bucket,
			imgName,
			file,
			-1,
			minio.PutObjectOptions{
				ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				UserMetadata: map[string]string{
					"originalname": fileName,
				},
			},
		)
		if err != nil {
			f.logger.Error("upload export task failed", log.Error(err))
			return nil
		}
		ossPath := fmt.Sprintf("/%s/%s", domain.Bucket, imgName)
		res, err := f.crawler.ScrapeURL(ctx, ossPath, kbID)
		if err != nil {
			f.logger.Error("scrape export task failed", log.Error(err))
			return nil
		}
		return res
	})

	successResults2 := lo.Filter(res, func(resp *domain.ScrapeResp, _ int) bool {
		return resp != nil
	})
	for i, resp := range successResults2 {
		f.logger.Debug("Scraped content",
			log.Int("index", i),
			log.String("title", resp.Title),
			log.Int("content_length", len(resp.Content)))
	}
	if len(successResults2) < len(res) {
		return "", "", fmt.Errorf("some downloadExportTask failed (%d/%d succeeded)", len(successResults2), len(res))
	}
	// 在最后部分
	var (
		title   string
		content strings.Builder
	)
	switch objType {
	case 2:
		title, err = getSheetTitle(ctx, appID, secret, sheetToken, usserAccessToken)
		if err != nil {
			f.logger.Error("get sheet title failed", log.Error(err))
			return "", "", err
		}
	case 3:
		title, err = getAppTitle(ctx, appID, secret, sheetToken, usserAccessToken)
		if err != nil {
			f.logger.Error("get app title failed", log.Error(err))
			return "", "", err
		}
	}
	if title == "" {
		title = "未命名表格"
	}
	content.WriteString(fmt.Sprintf("# %s\n\n", title))
	for _, successResult2 := range successResults2 {
		content.WriteString(successResult2.Content)
	}
	return title, content.String(), nil
}

type getExportTaskResp struct {
	FileName  string
	FileToken string
}

func (f *FeishuUseCase) getExportTask(ctx context.Context, appID, secret, ticket, sheetToken, userAccessToken string) (*getExportTaskResp, error) {
	client := lark.NewClient(appID, secret)
	req := larkdrive1.NewGetExportTaskReqBuilder().
		Ticket(ticket).
		Token(sheetToken).
		Build()

	// 发起请求
	resp, err := client.Drive.ExportTask.Get(ctx, req, larkcore.WithUserAccessToken(userAccessToken))
	if err != nil {
		return nil, fmt.Errorf("get export task failed: %v", err)
	}
	if !resp.Success() {
		return nil, fmt.Errorf("get export task failed: %s", resp.Msg)
	}

	return &getExportTaskResp{
		FileName:  *resp.Data.Result.FileName,
		FileToken: *resp.Data.Result.FileToken,
	}, nil
}

func (f *FeishuUseCase) downloadExportTask(ctx context.Context, appID, secret, fileToken, userAccessToken string) (string, io.Reader, error) {
	client := lark.NewClient(appID, secret)
	// 创建请求对象
	req := larkdrive1.NewDownloadExportTaskReqBuilder().
		FileToken(fileToken).
		Build()

	// 发起请求
	resp, err := client.Drive.ExportTask.Download(ctx, req, larkcore.WithUserAccessToken(userAccessToken))
	// 处理错误
	if err != nil {
		return "", nil, fmt.Errorf("download export task failed: %v", err)
	}
	return resp.FileName, resp.File, nil
}

func (f *FeishuUseCase) creatExportTask(ctx context.Context, objType int, appID, secret, token, userAccessToken string, subIDs []string) ([]string, error) {
	SheetType := "sheet"
	if objType == 3 {
		SheetType = "bitable"
	}
	client := lark.NewClient(appID, secret)
	res := parallel.Map(subIDs, func(subID string, _ int) string {
		req := larkdrive1.NewCreateExportTaskReqBuilder().
			ExportTask(larkdrive1.NewExportTaskBuilder().
				FileExtension(`xlsx`).
				Token(token).
				Type(SheetType).
				SubId(subID).
				Build()).
			Build()

		resp, err := client.Drive.ExportTask.Create(ctx, req, larkcore.WithUserAccessToken(userAccessToken))
		if err != nil {
			return ""
		}
		f.logger.Debug("Export task created", log.String("subId", subID), log.String("ticket", *resp.Data.Ticket))
		return *resp.Data.Ticket
	})
	// 处理错误
	successResults := lo.Filter(res, func(resp string, _ int) bool {
		return resp != ""
	})
	if len(successResults) < len(subIDs) {
		return nil, fmt.Errorf("some exports failed (%d/%d succeeded)", len(successResults), len(subIDs))
	}
	return res, nil
}

func (f *FeishuUseCase) getSheets(ctx context.Context, appID, secret, sheetToken, userAccessToken string) ([]*larksheets.Sheet, error) {
	// 创建 Client
	client := lark.NewClient(appID, secret)
	// 创建请求对象
	req := larksheets.NewQuerySpreadsheetSheetReqBuilder().
		SpreadsheetToken(sheetToken).
		Build()

	// 发起请求
	resp, err := client.Sheets.SpreadsheetSheet.Query(ctx, req, larkcore.WithUserAccessToken(userAccessToken))
	// 处理错误
	if err != nil {
		f.logger.Error("get sheets failed", log.Error(err))
		return nil, fmt.Errorf("get sheets failed: %v", err)
	}
	// 服务端错误处理
	if !resp.Success() {
		f.logger.Error("get sheets failed", log.String("logId", resp.RequestId()), log.String("error", larkcore.Prettify(resp.CodeError)))
		return nil, fmt.Errorf("get sheets failed: %s", resp.Msg)
	}
	return resp.Data.Sheets, nil
}
