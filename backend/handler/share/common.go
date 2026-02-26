package share

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/share/v1"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/chaitin/panda-wiki/utils"
)

type ShareCommonHandler struct {
	*handler.BaseHandler
	logger      *log.Logger
	fileUsecase *usecase.FileUsecase
}

func NewShareCommonHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	fileUsecase *usecase.FileUsecase,
) *ShareCommonHandler {
	h := &ShareCommonHandler{
		BaseHandler: baseHandler,
		logger:      logger,
		fileUsecase: fileUsecase,
	}

	share := e.Group("share/v1/common",
		func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				c.Response().Header().Set("Access-Control-Allow-Origin", "*")
				c.Response().Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				c.Response().Header().Set("Access-Control-Allow-Headers", "Content-Type, Origin, Accept")
				if c.Request().Method == "OPTIONS" {
					return c.NoContent(http.StatusOK)
				}
				return next(c)
			}
		})
	share.POST("/file/upload", h.FileUpload, h.ShareAuthMiddleware.Authorize)
	share.POST("/file/upload/url", h.FileUploadByUrl, h.ShareAuthMiddleware.Authorize)
	return h
}

// FileUpload 文件上传
//
//	@Tags			ShareFile
//	@Summary		文件上传
//	@Description	前台用户上传文件,目前只支持图片文件上传
//	@ID				share-FileUpload
//	@Accept			multipart/form-data
//	@Produce		json
//	@Param			X-KB-ID			header		string	true	"kb id"
//	@Param			file			formData	file	true	"File"
//	@Param			captcha_token	formData	string	true	"captcha_token"
//	@Success		200				{object}	domain.Response{data=v1.FileUploadResp}
//	@Router			/share/v1/common/file/upload [post]
func (h *ShareCommonHandler) FileUpload(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.ShareFileUploadReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request parameters", err)
	}

	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	req.KbId = kbID

	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "failed to get file", err)
	}

	if !utils.IsImageFile(file.Filename) {
		return h.NewResponseWithError(c, "只支持图片文件上传", fmt.Errorf("unsupported file type: %s", file.Filename))
	}

	// validate captcha token
	if !h.Captcha.ValidateToken(ctx, req.CaptchaToken) {
		return h.NewResponseWithError(c, "failed to validate captcha token", nil)
	}

	key, err := h.fileUsecase.UploadFile(ctx, req.KbId, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	return h.NewResponseWithData(c, v1.FileUploadResp{
		Key: key,
	})
}

// FileUploadByUrl 通过url上传文件
//
//	@Tags			ShareFile
//	@Summary		文件上传
//	@Description	前台用户上传文件,目前只支持图片文件上传
//	@ID				share-FileUploadByUrl
//	@Accept			json
//	@Produce		json
//	@Param			body	body		v1.ShareFileUploadUrlReq	true	"body"
//	@Success		200		{object}	domain.Response{data=v1.ShareFileUploadUrlResp}
//	@Router			/share/v1/common/file/upload/url [post]
func (h *ShareCommonHandler) FileUploadByUrl(c echo.Context) error {
	ctx := c.Request().Context()

	var req v1.ShareFileUploadUrlReq
	if err := c.Bind(&req); err != nil {
		return h.NewResponseWithError(c, "invalid request parameters", err)
	}

	if err := c.Validate(req); err != nil {
		return h.NewResponseWithError(c, "validate request body failed", err)
	}

	kbID := c.Request().Header.Get("X-KB-ID")
	if kbID == "" {
		return h.NewResponseWithError(c, "kb_id is required", nil)
	}
	req.KbId = kbID

	parsedURL, err := url.Parse(req.Url)
	if err != nil {
		return h.NewResponseWithError(c, "invalid URL format", err)
	}
	if !utils.IsImageFile(parsedURL.Path) {
		return h.NewResponseWithError(c, "只支持图片文件上传", fmt.Errorf("unsupported file type: %s", req.Url))
	}

	// validate captcha token
	if !h.Captcha.ValidateToken(ctx, req.CaptchaToken) {
		return h.NewResponseWithError(c, "failed to validate captcha token", nil)
	}

	key, err := h.fileUsecase.UploadFileByUrl(ctx, req.KbId, req.Url)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	return h.NewResponseWithData(c, v1.ShareFileUploadUrlResp{
		Key: key,
	})
}
