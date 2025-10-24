package v1

import (
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/crawler/v1"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/consts"
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
	group.POST("/parse", h.CrawlerParse)
	group.POST("/export", h.CrawlerExport)
	group.GET("/result", h.CrawlerResult)
	group.POST("/results", h.CrawlerResults)

	return h
}

// CrawlerParse 解析文档树
//
//	@Summary		解析文档树
//	@Description	解析文档树
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CrawlerParseReq	true	"Scrape"
//	@Success		200		{object}	domain.PWResponse{data=v1.CrawlerParseResp}
//	@Router			/api/v1/crawler/parse [post]
func (h *CrawlerHandler) CrawlerParse(c echo.Context) error {
	var req v1.CrawlerParseReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	if req.CrawlerSource == consts.CrawlerSourceFeishu {
		if req.FeishuSetting.AppID == "" || req.FeishuSetting.AppSecret == "" || req.FeishuSetting.UserAccessToken == "" {
			return h.NewResponseWithError(c, "validate request param feishu failed", nil)
		}
	} else {
		if req.Key == "" {
			return h.NewResponseWithError(c, "validate request param key failed", nil)

		}
	}

	resp, err := h.usecase.ParseUrl(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "scrape url failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// CrawlerExport
//
//	@Summary		CrawlerExport
//	@Description	CrawlerExport
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CrawlerExportReq	true	"Scrape"
//	@Success		200		{object}	domain.PWResponse{data=v1.CrawlerExportResp}
//	@Router			/api/v1/crawler/export [post]
func (h *CrawlerHandler) CrawlerExport(c echo.Context) error {
	var req v1.CrawlerExportReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request body is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.ExportDoc(c.Request().Context(), &req)
	if err != nil {
		return h.NewResponseWithError(c, "scrape url failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// CrawlerResult
//
//	@Summary		Get Crawler Result
//	@Description	Retrieve the result of a previously started scraping task
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.CrawlerResultReq	true	"Crawler Result Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.CrawlerResultResp}
//	@Router			/api/v1/crawler/result [get]
func (h *CrawlerHandler) CrawlerResult(c echo.Context) error {
	var req v1.CrawlerResultReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request params is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.ScrapeGetResult(c.Request().Context(), req.TaskId)
	if err != nil {
		h.logger.Error("get scrape result failed", log.Error(err))
		return h.NewResponseWithError(c, "get scrape result failed", err)
	}
	return h.NewResponseWithData(c, resp)
}

// CrawlerResults
//
//	@Summary		Get Crawler Results
//	@Description	Retrieve the results of a previously started scraping task
//	@Tags			crawler
//	@Accept			json
//	@Produce		json
//	@Param			param	body		v1.CrawlerResultsReq	true	"Crawler Results Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.CrawlerResultsResp}
//	@Router			/api/v1/crawler/results [post]
func (h *CrawlerHandler) CrawlerResults(c echo.Context) error {
	var req v1.CrawlerResultsReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "request params is invalid", err)
	}
	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}
	resp, err := h.usecase.ScrapeGetResults(c.Request().Context(), req.TaskIds)
	if err != nil {
		h.logger.Error("get scrape results failed", log.Error(err))
		return h.NewResponseWithError(c, "get scrape results failed", err)
	}
	return h.NewResponseWithData(c, resp)
}
