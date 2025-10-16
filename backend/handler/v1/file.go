package v1

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/middleware"
	"github.com/chaitin/panda-wiki/store/s3"
	"github.com/chaitin/panda-wiki/usecase"
	"github.com/chaitin/panda-wiki/utils"
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
	group := echo.Group("/api/v1/file")
	group.POST("/upload", h.Upload, h.auth.Authorize)
	group.POST("/upload/anydoc", h.UploadAnydoc)
	group.GET("/download/:key", h.Download)
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
		Key:      key,
		Filename: file.Filename,
	})
}

// UploadAnydoc
//
//	@Summary		Upload Anydoc File
//	@Description	Upload Anydoc File
//	@Tags			file
//	@Accept			multipart/form-data
//	@Param			file	formData	file	true	"File"
//	@Param			path	formData	string	true	"File Path"
//	@Success		200		{object}	domain.AnydocUploadResp
//	@Router			/api/v1/file/upload/anydoc [post]
func (h *FileHandler) UploadAnydoc(c echo.Context) error {
	clientIP := fmt.Sprintf("%s.17", h.config.SubnetPrefix)
	if utils.GetClientIPFromRemoteAddr(c) != clientIP {
		return c.JSON(http.StatusUnauthorized, domain.AnydocUploadResp{
			Code: 1,
			Err:  "invalid required",
		})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, domain.AnydocUploadResp{
			Code: 1,
			Err:  "invalid required",
		})
	}

	path := c.FormValue("path")
	if path == "" {
		return c.JSON(http.StatusBadRequest, domain.AnydocUploadResp{
			Code: 1,
			Err:  "invalid required",
		})
	}

	h.logger.Debug("AnydocUpload file", "path", path)
	_, err = h.fileUsecase.AnyDocUploadFile(c.Request().Context(), file, path)
	if err != nil {
		return h.NewResponseWithError(c, "upload failed", err)
	}
	url := fmt.Sprintf("/static-file/%s", strings.TrimPrefix(path, "/"))
	h.logger.Debug("AnydocUpload file", "path", url)

	return c.JSON(http.StatusOK, domain.AnydocUploadResp{
		Code: 0,
		Data: url,
	})
}

// Download
//
//	@Summary		Download File
//	@Description	Download File with original filename
//	@Tags			file
//	@Param			key	path	string	true	"File Key"
//	@Success		200
//	@Router			/api/v1/file/download/{key} [get]
func (h *FileHandler) Download(c echo.Context) error {
	key := c.Param("key")
	if key == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "key is required"})
	}

	// Get file info from Minio to retrieve original filename
	objInfo, err := h.fileUsecase.GetFileInfo(c.Request().Context(), key)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "file not found"})
	}

	// Get original filename from metadata
	originalName := objInfo.Metadata.Get("X-Amz-Meta-Originalname")
	if originalName == "" {
		// Fallback to key if original name not found
		originalName = filepath.Base(key)
	}

	// Set headers for file download
	c.Response().Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", originalName))
	c.Response().Header().Set("Content-Type", objInfo.ContentType)

	// Stream file from Minio
	return h.fileUsecase.StreamFile(c.Response(), c.Request().Context(), key)
}
