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
	logger          *log.Logger
	usecase         *usecase.CrawlerUsecase
	notnion_usecase *usecase.NotionUseCase
	epub_usecase    *usecase.EpubUsecase
	config          *config.Config
}

func NewCrawlerHandler(echo *echo.Echo,
	baseHandler *handler.BaseHandler,
	auth middleware.AuthMiddleware,
	logger *log.Logger,
	config *config.Config,
	usecase *usecase.CrawlerUsecase,
	notnion_usecase *usecase.NotionUseCase,
	epub_usecase *usecase.EpubUsecase,
) *CrawlerHandler {
	h := &CrawlerHandler{
		BaseHandler:     baseHandler,
		logger:          logger.WithModule("handler.v1.crawler"),
		config:          config,
		usecase:         usecase,
		notnion_usecase: notnion_usecase,
		epub_usecase:    epub_usecase,
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
	resp, err := h.notnion_usecase.GetList(c.Request().Context(), req.Intregration, req.CationTitle)
	//notnion := usecase.NewNotionClient(req.Intregration, h.logger)
	//resp, err := notnion.GetList(c.Request().Context(), req.CationTitle)
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
	resp, err := h.notnion_usecase.GetDocs(c.Request().Context(), req)
	//resp, err := usecase.NewNotionClient(req.Integration, h.logger).GetPagesContent(req.PageIDs)
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
	resp, err := h.usecase.ScrapeURL(c.Request().Context(), req.URL)
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
	//uplad a file
	var req domain.EpubReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "bind failed", err)
	}
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
	resq, err := h.epub_usecase.Convert(c.Request().Context(), req.KbID, data)
	if err != nil {
		return h.NewResponseWithError(c, "convert failed", err)
	}
	return h.NewResponseWithData(c, resq)
}
