package v1

import (
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/usecase"
)

type FileHandler struct {
	*handler.BaseHandler
	logger      *log.Logger
	auth        middleware.AuthMiddleware
	config      *config.Config
	fileUsecase *usecase.FileUsecase
}

func NewFileHandler(echo *echo.Echo, baseHandler *handler.BaseHandler, logger *log.Logger, auth middleware.AuthMiddleware, minioClient *s3.MinioClient, config *config.Config, fileUsecase *usecase.FileUsecase) *FileHandler {
	h := &FileHandler{
		BaseHandler: baseHandler,
		logger:      logger.WithModule("handler.v1.file"),
		auth:        auth,
		config:      config,
		fileUsecase: fileUsecase,
	}
	group := echo.Group("/api/v1/file", h.auth.Authorize)
	group.POST("/upload", h.Upload)
	return h
}

// Upload
//
//	@Summary		Upload File
//	@Description	Upload File
//	@Tags			file
//	@Accept			multipart/form-data
//	@Param			file	formData	file	true	"File"
//	@Param			kb_id	formData	string	false	"Knowledge Base ID"
//	@Success		200		{object}	domain.ObjectUploadResp
//	@Router			/api/v1/file/upload [post]
func (h *FileHandler) Upload(c echo.Context) error {
	cxt := c.Request().Context()
	kbID := c.FormValue("kb_id")
	if kbID == "" {
		kbID = uuid.New().String()
	}
	file, err := c.FormFile("file")
	if err != nil {
		return h.NewResponseWithError(c, "failed to get file", err)
	}
	key, err := h.fileUsecase.UploadFile(cxt, kbID, file)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}

	return h.NewResponseWithData(c, domain.ObjectUploadResp{
		Key: key,
	})
}
