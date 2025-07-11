package v1

import (
	"io"

	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/chaitin/panda-wiki/utils"
)

type CrawlerHandler struct {
	*handler.BaseHandler
	logger            *log.Logger
	usecase           *usecase.CrawlerUsecase
	notnionUsecase    *usecase.NotionUseCase
	epubUsecase       *usecase.EpubUsecase
	config            *config.Config
	wikijsUsecase     *usecase.WikiJSUsecase
	feishuUseCase     *usecase.FeishuUseCase
	confluenceusecase *usecase.ConfluenceUsecase
}

func NewCrawlerHandler(echo *echo.Echo,
	baseHandler *handler.BaseHandler,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
	config *config.Config,
	usecase *usecase.CrawlerUsecase,
	notnionUsecase *usecase.NotionUseCase,
	epubUsecase *usecase.EpubUsecase,
	wikijsUsecase *usecase.WikiJSUsecase,
	feishuUseCase *usecase.FeishuUseCase,
	confluenceusecase *usecase.ConfluenceUsecase,
) *CrawlerHandler {
	h := &CrawlerHandler{
		BaseHandler:       baseHandler,
		logger:            logger.WithModule("handler.v1.crawler"),
		config:            config,
		usecase:           usecase,
		notnionUsecase:    notnionUsecase,
		epubUsecase:       epubUsecase,
		wikijsUsecase:     wikijsUsecase,
		feishuUseCase:     feishuUseCase,
		confluenceusecase: confluenceusecase,
	}
	group := echo.Group("/api/v1/crawler", auth.Authorize)
	group.POST("/parse_rss", h.ParseRSS)
	group.POST("/parse_sitemap", h.ParseSitemap)
	group.POST("/scrape", h.Scrape)
	// notion app
	group.POST("/notion/get_list", h.NotionGetList)
	group.POST("/notion/get_doc", h.GetDocs)
	//  epub
	group.POST("/epub/convert", h.QpubConvert)
	// wikijs
	group.POST("/wikijs/analysis_export_file", h.AnalysisWikijsExportFile)
	// feishu
	group.POST("/feishu/list_spaces", h.FeishuListSpaces)
	group.POST("/feishu/list_doc", h.FeishuListDoc)
	group.POST("/feishu/search_wiki", h.FeishuSearchWiki)
	group.POST("/feishu/get_doc", h.FeishuGetDoc)
	// confluence
	group.POST("/confluence/analysis_export_file", h.AnalysisConfluenceExportFile)
	return h
}

/*
curl -X POST \
  http://10.10.7.195:8000/api/v1/crawler/notion/get_list \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDk3MTcxNDAsImlkIjoiZDZhNTE2MGMtNjU3Ni00MzdmLTk5NzYtMWViMmYxNDJhNzhkIn0.ne9vjlo2_V_2xfcEqMHN9ZkazZajEXcImBtfeKHkwXo" \
  -d '{"integration": "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", "caption_title": ""}' \
  --insecure
*/
// NotionGetList
//
//	@Summary		NotionGetList
//	@Description	NotionGetList
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.NotnionGetListReq	true	"Notion Get List"
//	@Success		200		{object}	domain.Response{data=[]domain.PageInfo}
//	@Router			/api/v1/crawler/notion/get_list [post]
func (h *CrawlerHandler) NotionGetList(c echo.Context) error {
	var req domain.NotnionGetListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.notnionUsecase.GetList(c.Request().Context(), req.Intregration, req.CationTitle)
	// notnion := usecase.NewNotionClient(req.Intregration, h.logger)
	// resp, err := notnion.GetList(c.Request().Context(), req.CationTitle)
	if err != nil {
		return h.NewResponseWithError(c, "parse notion failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

/*
curl -X POST \
	http://10.10.7.195:8000/api/v1/crawler/notion/get_doc \
	-H "Content-Type: application/json" \
	-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDk3MTcxNDAsImlkIjoiZDZhNTE2MGMtNjU3Ni00MzdmLTk5NzYtMWViMmYxNDJhNzhkIn0.ne9vjlo2_V_2xfcEqMHN9ZkazZajEXcImBtfeKHkwXo" \
	-d '{"integration": "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","pages": [{"id": "20e3d80d-fab4-809c-a04c-d8df3821d961", "title": "28th Birthday"}]}' \
	--insecure
*/
// GetDocs
//
//	@Summary		GetDocs
//	@Description	GetDocs
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.GetDocsReq	true	"Get Docs"
//	@Success		200		{object}	domain.Response{data=[]domain.Page}
//	@Router			/api/v1/crawler/notion/get_doc [post]
func (h *CrawlerHandler) GetDocs(c echo.Context) error {
	var req domain.GetDocsReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body failed", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.notnionUsecase.GetDocs(c.Request().Context(), req)
	// resp, err := usecase.NewNotionClient(req.Integration, h.logger).GetPagesContent(req.PageIDs)
	if err != nil {
		return h.NewResponseWithError(c, "get Docs failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// Parse RSS
//
//	@Summary		Parse RSS
//	@Description	Parse RSS
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.ParseURLReq	true	"Parse URL"
//	@Success		200		{object}	domain.Response{data=domain.ParseURLResp}
//	@Router			/api/v1/crawler/parse_rss [post]
func (h *CrawlerHandler) ParseRSS(c echo.Context) error {
	var req domain.ParseURLReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	feed, err := utils.ParseFeed(req.URL)
	if err != nil {
		return h.NewResponseWithError(c, "parse rss url failed", err)
	}
	items := make([]domain.ParseURLItem, 0)
	for _, item := range feed.Items {
		items = append(items, domain.ParseURLItem{
			URL:       item.Link,
			Title:     item.Title,
			Desc:      item.Description,
			Published: item.Published,
		})
	}
	return h.NewResponseWithData(c, domain.ParseURLResp{
		Items: items,
	})
}

// Parse Sitemap
//
//	@Summary		Parse Sitemap
//	@Description	Parse Sitemap
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.ParseURLReq	true	"Parse URL"
//	@Success		200		{object}	domain.Response{data=domain.ParseURLResp}
//	@Router			/api/v1/crawler/parse_sitemap [post]
func (h *CrawlerHandler) ParseSitemap(c echo.Context) error {
	var req domain.ParseURLReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	links, err := utils.ParseSitemap(req.URL)
	if err != nil {
		return h.NewResponseWithError(c, "parse sitemap url failed", err)
	}
	items := make([]domain.ParseURLItem, 0)
	for _, link := range links {
		items = append(items, domain.ParseURLItem{
			URL: link,
		})
	}
	return h.NewResponseWithData(c, domain.ParseURLResp{
		Items: items,
	})
}

// Scrape
//
//	@Summary		Scrape
//	@Description	Scrape
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.ScrapeReq	true	"Scrape"
//	@Success		200		{object}	domain.Response{data=domain.ScrapeResp}
//	@Router			/api/v1/crawler/scrape [post]
func (h *CrawlerHandler) Scrape(c echo.Context) error {
	var req domain.ScrapeReq
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

// QpubConvert
//
//	@Summary		QpubConvert
//	@Description	QpubConvert
//	@Tags			crawler
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.Response{data=domain.EpubResp}
//	@Router			/api/v1/crawler/epub/convert [post]
func (h *CrawlerHandler) QpubConvert(c echo.Context) error {
	// uplad a file
	var req domain.EpubReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}

	f, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	file, err := f.Open()
	if err != nil {
		return h.NewResponseWithError(c, "open file failed", err)
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		return h.NewResponseWithError(c, "read file failed", err)
	}
	resq, err := h.epubUsecase.Convert(c.Request().Context(), req.KbID, data)
	if err != nil {
		return h.NewResponseWithError(c, "convert failed", err)
	}
	return h.NewResponseWithData(c, resq)
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
//	@Success		200		{object}	domain.Response{data=[]domain.WikiJSResp}
//	@Router			/api/v1/crawler/wikijs/analysis_export_file [post]
func (h *CrawlerHandler) AnalysisWikijsExportFile(c echo.Context) error {
	f, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	var req domain.WikiJSReq
	req.KBID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}
	res, err := h.wikijsUsecase.AnalysisExportFile(c.Request().Context(), f, req.KBID)
	if err != nil {
		return h.NewResponseWithError(c, "analysis export file failed", err)
	}
	return h.NewResponseWithData(c, res)
}

// FeishuListSpaces
//
//	@Summary		FeishuListSpaces
//	@Description	List All Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.GetSpaceListReq	true	"List Spaces"
//	@Success		200		{object}	domain.Response{data=[]domain.GetSpaceListResp}
//	@Router			/api/v1/crawler/feishu/list_spaces [post]
func (h *CrawlerHandler) FeishuListSpaces(c echo.Context) error {
	var req *domain.GetSpaceListReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.feishuUseCase.GetSpacelist(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "list spaces failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuListDoc godoc
//
//	@Summary		FeishuListDoc
//	@Description	List Docx in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.SearchDocxReq	true	"Search Docx"
//	@Success		200		{object}	domain.Response{data=[]domain.SearchDocxResp}
//	@Router			/api/v1/crawler/feishu/list_doc [post]
func (h *CrawlerHandler) FeishuListDoc(c echo.Context) error {
	var req *domain.SearchDocxReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.feishuUseCase.ListDocx(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "search docx failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuSearchWiki
//
//	@Summary		FeishuSearchWiki
//	@Description	Search Wiki in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.SearchWikiReq	true	"Search Wiki"
//	@Success		200		{object}	domain.Response{data=[]domain.SearchWikiResp}
//	@Router			/api/v1/crawler/feishu/search_wiki [post]
func (h *CrawlerHandler) FeishuSearchWiki(c echo.Context) error {
	var req *domain.SearchWikiReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	resp, err := h.feishuUseCase.SearchWiki(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "search wiki failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// FeishuGetDocx
//
//	@Summary		FeishuGetDocx
//	@Description	Get Docx in Feishu Spaces
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		domain.GetDocxReq	true	"Get Docx"
//	@Success		200		{object}	domain.Response{data=[]domain.GetDocxResp}
//	@Router			/api/v1/crawler/feishu/get_doc [post]
func (h *CrawlerHandler) FeishuGetDoc(c echo.Context) error {
	var req *domain.GetDocxReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.feishuUseCase.GetDoc(c.Request().Context(), req)
	if err != nil {
		return h.NewResponseWithError(c, "get docx failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// AnalysisConfluenceExportFile
//
//	@Summary		AnalysisConfluenceExportFile
//	@Description	Analyze Confluence Export File
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			file	formData	file	true	"file"
//	@Param			kb_id	formData	string	true	"kb_id"
//	@Success		200		{object}	domain.Response{data=[]domain.AnalysisConfluenceResp}
//	@Router			/api/v1/crawler/confluence/analysis_export_file [post]
func (h *CrawlerHandler) AnalysisConfluenceExportFile(c echo.Context) error {
	f, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "get file failed", err)
	}
	var req domain.AnalysisConfluenceReq
	req.KbID = c.FormValue("kb_id")
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate failed", err)
	}
	file, err := f.Open()
	if err != nil {
		return h.NewResponseWithError(c, "open file failed", err)
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		return h.NewResponseWithError(c, "read file failed", err)
	}
	resp, err := h.confluenceusecase.Analysis(c.Request().Context(), data, req.KbID)
	if err != nil {
		return h.NewResponseWithError(c, "analysis confluence export file failed", err)
	}
	return h.NewResponseWithData(c, resp)
}
