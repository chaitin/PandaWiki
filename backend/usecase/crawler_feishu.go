package usecase

import (
	"context"

	"github.com/google/uuid"

	v1 "github.com/chaitin/panda-wiki/api/crawler/v1"
	"github.com/chaitin/panda-wiki/pkg/anydoc"
)

func (u *CrawlerUsecase) FeishuListSpace(ctx context.Context, req *v1.FeishuSpaceListReq) ([]v1.FeishuSpaceListResp, error) {
	id := uuid.New().String()

	feishuListResp, err := u.anydocClient.FeishuListDocs(ctx, id, req.AppID, req.AppSecret, req.UserAccessToken, "")
	if err != nil {
		return nil, err
	}

	var results []v1.FeishuSpaceListResp
	for _, doc := range feishuListResp.Data.Docs {
		results = append(results, v1.FeishuSpaceListResp{
			SpaceId: doc.ID,
			Name:    doc.Title,
		})
	}

	return results, nil
}

func (u *CrawlerUsecase) FeishuListCloudDoc(ctx context.Context, req *v1.FeishuListCloudDocReq) ([]v1.FeishuListCloudDocResp, error) {
	id := uuid.New().String()

	feishuListResp, err := u.anydocClient.FeishuListDocs(ctx, id, req.AppID, req.AppSecret, req.UserAccessToken, anydoc.SpaceIdCloud)
	if err != nil {
		return nil, err
	}

	var results []v1.FeishuListCloudDocResp
	for _, doc := range feishuListResp.Data.Docs {
		results = append(results, v1.FeishuListCloudDocResp{
			Title:    doc.Title,
			ID:       id,
			DocId:    doc.ID,
			FileType: doc.FileType,
			SpaceId:  anydoc.SpaceIdCloud,
		})
	}

	return results, nil
}

func (u *CrawlerUsecase) FeishuSearchWiki(ctx context.Context, req *v1.FeishuSearchWikiReq) ([]v1.FeishuSearchWikiResp, error) {
	id := uuid.New().String()

	feishuListResp, err := u.anydocClient.FeishuListDocs(ctx, id, req.AppID, req.AppSecret, req.UserAccessToken, req.SpaceId)
	if err != nil {
		return nil, err
	}

	var results []v1.FeishuSearchWikiResp
	for _, doc := range feishuListResp.Data.Docs {
		results = append(results, v1.FeishuSearchWikiResp{
			Title:    doc.Title,
			ID:       id,
			DocId:    doc.ID,
			FileType: doc.FileType,
			SpaceId:  req.SpaceId,
		})
	}

	return results, nil
}

func (u *CrawlerUsecase) FeishuGetDoc(ctx context.Context, req *v1.FeishuGetDocReq) (*v1.FeishuGetDocResp, error) {

	exportResp, err := u.anydocClient.FeishuExportDoc(ctx, req.ID, req.DocId, req.FileType, req.SpaceId, req.KbID)
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
	feishuListResp, err := u.anydocClient.FeishuListDocs(ctx, req.ID, "", "", "", req.SpaceId)
	var docTitle string
	if err == nil {
		for _, doc := range feishuListResp.Data.Docs {
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

	return &v1.FeishuGetDocResp{
		Content: string(fileBytes),
	}, nil
}
