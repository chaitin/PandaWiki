package v1

import (
	"fmt"

	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/crawler/v1"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
)

type CrawlerHandler struct {
	*handler.BaseHandler
	logger      *log.Logger
	usecase     *usecase.CrawlerUsecase
	config      *config.Config
	fileUsecase *usecase.FileUsecase
}

func NewCrawlerHandler(echo *echo.Echo,
	baseHandler *handler.BaseHandler,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
	config *config.Config,
	usecase *usecase.CrawlerUsecase,
	fileUsecase *usecase.FileUsecase,
) *CrawlerHandler {
	h := &CrawlerHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.crawler"),
		config:      config,
		usecase:     usecase,
		fileUsecase: fileUsecase,
	}
	group := echo.Group("/api/v1/crawler", auth.Authorize)
	group.POST("/scrape", h.Scrape)
	//  epub
	group.POST("/epub/convert", h.EpubConvert)
	// wikijs
	group.POST("/wikijs/analysis_export_file", h.AnalysisWikijsExportFile)
	// feishu
	group.POST("/feishu/list_spaces", h.FeishuListSpaces)
	group.POST("/feishu/list_doc", h.FeishuListCloudDoc)
	group.POST("/feishu/search_wiki", h.FeishuWikiSearch)
	group.POST("/feishu/get_doc", h.FeishuDoc)

	// yuque
	group.POST("/yuque/analysis_export_file", h.AnalysisYuqueExportFile)
	// rss
	group.POST("/rss/parse", h.RSSParse)
	group.POST("/rss/scrape", h.RSSScrape)
	// sitemap
	group.POST("/sitemap/parse", h.SitemapParse)
	group.POST("/sitemap/scrape", h.SitemapScrape)
	// notion
	group.POST("/notion/parse", h.NotionParse)
	group.POST("/notion/scrape", h.NotionScrape)
	// confluence
	group.POST("/confluence/parse", h.ConfluenceParse)
	group.POST("/confluence/scrape", h.ConfluenceScrape)
	// siyuan
	group.POST("/siyuan/parse", h.SiyuanParse)
	group.POST("/siyuan/scrape", h.SiyuanScrape)
	// mindoc
	group.POST("/mindoc/parse", h.MindocParse)
	group.POST("/mindoc/scrape", h.MindocScrape)
	return h
}

// NotionParse
//
//	@Summary		NotionParse
//	@Description	NotionParse
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.NotionParseReq	true	"Scrape"
//	@Success		200		{object}	domain.PWResponse{data=v1.NotionParseResp}
//	@Router			/api/v1/crawler/notion/parse [post]
func (h *CrawlerHandler) NotionParse(c echo.Context) error {
	var req v1.NotionParseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.NotionGetDocList(c.Request().Context(), req.Integration)
	if err != nil {
		return h.NewResponseWithError(c, "parse notion failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// NotionScrape
//
//	@Summary		NotionScrape
//	@Description	NotionScrape
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.NotionScrapeReq	true	"Get Docs"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.NotionScrapeResp}
//	@Router			/api/v1/crawler/notion/scrape [post]
func (h *CrawlerHandler) NotionScrape(c echo.Context) error {
	var req v1.NotionScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body failed", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.NotionGetDoc(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "get Docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// Scrape
//
//	@Summary		Scrape
//	@Description	Scrape
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.ScrapeReq	true	"Scrape"
//	@Success		200		{object}	domain.PWResponse{data=v1.ScrapeResp}
//	@Router			/api/v1/crawler/scrape [post]
func (h *CrawlerHandler) Scrape(c echo.Context) error {
	var req v1.ScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.ScrapeURL(c.Request().Context(), req.URL, req.KbID)
	if err != nil {
		return h.NewResponseWithError(c, "scrape url failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// EpubConvert
//
//	@Summary		EpubConvert
//	@Description	EpubConvert
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=domain.EpubResp}
//	@Router			/api/v1/crawler/epub/convert [post]
func (h *CrawlerHandler) EpubConvert(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	var req domain.EpubReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}
	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("EpubConvert UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.EpubHandle(c.Request().Context(), fileUrl, file.Filename, req.KbID)
	if err != nil {
		return h.NewResponseWithError(c, "analysis export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// AnalysisWikijsExportFile
//
//	@Summary		AnalysisWikijsExportFile
//	@Description	AnalysisWikijsExportFile
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.WikiJSResp}
//	@Router			/api/v1/crawler/wikijs/analysis_export_file [post]
func (h *CrawlerHandler) AnalysisWikijsExportFile(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	var req v1.WikiJSReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}
	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("AnalysisConfluenceExportFile UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.WikijsHandle(c.Request().Context(), fileUrl, file.Filename, req.KbID)
	if err != nil {
		return h.NewResponseWithError(c, "analysis export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// FeishuListSpaces
//
//	@Summary		FeishuListSpaces
//	@Description	List All Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.FeishuSpaceListReq	true	"List Spaces"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.FeishuSpaceListResp}
//	@Router			/api/v1/crawler/feishu/list_spaces [post]
func (h *CrawlerHandler) FeishuListSpaces(c echo.Context) error {
	var req *v1.FeishuSpaceListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.FeishuListSpace(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, fmt.Sprintf("list spaces failed %s", err.Error()), err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuListCloudDoc
//
//	@Summary		FeishuListCloudDoc
//	@Description	List Docx in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.FeishuListCloudDocReq	true	"Search Docx"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.FeishuListCloudDocResp}
//	@Router			/api/v1/crawler/feishu/list_doc [post]
func (h *CrawlerHandler) FeishuListCloudDoc(c echo.Context) error {
	var req *v1.FeishuListCloudDocReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.FeishuListCloudDoc(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, fmt.Sprintf("list spaces failed %s", err.Error()), err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuWikiSearch
//
//	@Summary		FeishuWikiSearch
//	@Description	Search Wiki in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.FeishuSearchWikiReq	true	"Search Wiki"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.FeishuSearchWikiResp}
//	@Router			/api/v1/crawler/feishu/search_wiki [post]
func (h *CrawlerHandler) FeishuWikiSearch(c echo.Context) error {
	var req *v1.FeishuSearchWikiReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	resp, err := h.usecase.FeishuSearchWiki(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, fmt.Sprintf("search wiki failed %s", err.Error()), err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuDoc
//
//	@Summary		FeishuDoc
//	@Description	Get Docx in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.FeishuGetDocReq	true	"Get Docx"
//	@Success		200		{object}	domain.PWResponse{data=[]v1.FeishuGetDocResp}
//	@Router			/api/v1/crawler/feishu/get_doc [post]
func (h *CrawlerHandler) FeishuDoc(c echo.Context) error {
	var req *v1.FeishuGetDocReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.FeishuGetDoc(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, fmt.Sprintf("get docx failed %s", err.Error()), err)
	}
	return h.NewResponseWithData(c, resp)
}

// ConfluenceParse
//
//	@Summary		ConfluenceParse
//	@Description	Parse Confluence Export File and return document list
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=v1.ConfluenceParseResp}
//	@Router			/api/v1/crawler/confluence/parse [post]
func (h *CrawlerHandler) ConfluenceParse(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}

	var req v1.ConfluenceParseReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}

	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("ConfluenceParse UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.ConfluenceParse(c.Request().Context(), fileUrl, file.Filename)
	if err != nil {
		return h.NewResponseWithError(c, "parse confluence export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// ConfluenceScrape
//
//	@Tags			crawler
//	@Summary		ConfluenceScrape
//	@Description	Scrape specific Confluence documents by ID
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.ConfluenceScrapeReq	true	"Scrape Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.ConfluenceScrapeResp}
//	@Router			/api/v1/crawler/confluence/scrape [post]
func (h *CrawlerHandler) ConfluenceScrape(c echo.Context) error {
	var req v1.ConfluenceScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.ConfluenceScrape(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "scrape confluence docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// AnalysisYuqueExportFile
//
//	@Summary		AnalysisYuqueExportFile
//	@Description	Analyze Yuque Export File
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=[]domain.YuqueResp}
//	@Router			/api/v1/crawler/yuque/analysis_export_file [post]
func (h *CrawlerHandler) AnalysisYuqueExportFile(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	var req domain.YuqueReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}
	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("AnalysisYuqueExportFile UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.YuqueHandle(c.Request().Context(), fileUrl, file.Filename, req.KbID)
	if err != nil {
		return h.NewResponseWithError(c, "analysis yuque export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// RSSParse
//
//	@Tags			crawler
//	@Summary		Parse RSS
//	@Description	Parse RSS
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.RssParseReq	true	"Parse URL"
//	@Success		200		{object}	domain.PWResponse{data=v1.RssParseResp}
//	@Router			/api/v1/crawler/rss/parse [post]
func (h *CrawlerHandler) RSSParse(c echo.Context) error {
	var req v1.RssParseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.GetRSSParse(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "get Docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// RSSScrape
//
//	@Tags			crawler
//	@Summary		RSSScrape
//	@Description	RSSScrape
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.RssScrapeReq	true	"Parse URL"
//	@Success		200		{object}	domain.PWResponse{data=v1.RssScrapeResp}
//	@Router			/api/v1/crawler/rss/scrape [post]
func (h *CrawlerHandler) RSSScrape(c echo.Context) error {
	var req v1.RssScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.GetRssDoc(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "get Docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// SitemapParse
//
//	@Tags			crawler
//	@Summary		Parse Sitemap
//	@Description	Parse Sitemap
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.SitemapParseReq	true	"Parse URL"
//	@Success		200		{object}	domain.PWResponse{data=SitemapParseResp}
//	@Router			/api/v1/crawler/sitemap/parse [post]
func (h *CrawlerHandler) SitemapParse(c echo.Context) error {
	var req v1.SitemapParseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.SitemapGetUrls(c.Request().Context(), req.URL)
	if err != nil {
		return h.NewResponseWithError(c, "parse sitemap url failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// SitemapScrape
//
//	@Tags			crawler
//	@Summary		SitemapScrape
//	@Description	SitemapScrape
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.SitemapScrapeReq	true	"Parse URL"
//	@Success		200		{object}	domain.PWResponse{data=v1.SitemapScrapeResp}
//	@Router			/api/v1/crawler/sitemap/scrape [post]
func (h *CrawlerHandler) SitemapScrape(c echo.Context) error {
	var req v1.SitemapScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.SitemapGetDoc(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "parse sitemap url failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// SiyuanParse
//
//	@Summary		SiyuanParse
//	@Description	Parse Siyuan Export File and return document list
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=v1.SiyuanParseResp}
//	@Router			/api/v1/crawler/siyuan/parse [post]
func (h *CrawlerHandler) SiyuanParse(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}

	var req v1.SiyuanParseReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}

	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("SiyuanParse UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.SiyuanParse(c.Request().Context(), fileUrl, file.Filename)
	if err != nil {
		return h.NewResponseWithError(c, "parse Siyuan export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// SiyuanScrape
//
//	@Tags			crawler
//	@Summary		SiyuanScrape
//	@Description	Scrape specific Siyuan documents by ID
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.SiyuanScrapeReq	true	"Scrape Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.SiyuanScrapeResp}
//	@Router			/api/v1/crawler/siyuan/scrape [post]
func (h *CrawlerHandler) SiyuanScrape(c echo.Context) error {
	var req v1.SiyuanScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.SiyuanScrape(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "scrape Siyuan docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// MindocParse
//
//	@Summary		MindocParse
//	@Description	Parse Mindoc Export File and return document list
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.PWResponse{data=v1.MindocParseResp}
//	@Router			/api/v1/crawler/mindoc/parse [post]
func (h *CrawlerHandler) MindocParse(c echo.Context) error {
	ctx := c.Request().Context()

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}

	var req v1.MindocParseReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}

	fileUrl, err := h.fileUsecase.UploadFileGetUrl(ctx, req.KbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	h.logger.Info("MindocParse UploadFile successfully", "fileUrl", fileUrl)

	resp, err := h.usecase.MindocParse(c.Request().Context(), fileUrl, file.Filename)
	if err != nil {
		return h.NewResponseWithError(c, "parse Mindoc export file failed", err)
	}

	return h.NewResponseWithData(c, resp)
}

// MindocScrape
//
//	@Tags			crawler
//	@Summary		MindocScrape
//	@Description	Scrape specific Mindoc documents by ID
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.MindocScrapeReq	true	"Scrape Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.MindocScrapeResp}
//	@Router			/api/v1/crawler/mindoc/scrape [post]
func (h *CrawlerHandler) MindocScrape(c echo.Context) error {
	var req v1.MindocScrapeReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	resp, err := h.usecase.MindocScrape(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "scrape Mindoc docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}
