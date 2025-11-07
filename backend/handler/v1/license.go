package v1

import (
	"github.com/labstack/echo/v4"

	v1 "github.com/chaitin/panda-wiki/api/license/v1"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/handler"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type LicenseHandler struct {
	*handler.BaseHandler
	logger         *log.Logger
	licenseUsecase *usecase.LicenseUsecase
}

func NewLicenseHandler(
	e *echo.Echo,
	baseHandler *handler.BaseHandler,
	logger *log.Logger,
	licenseUsecase *usecase.LicenseUsecase,
) *LicenseHandler {
	h := &LicenseHandler{
		BaseHandler:    baseHandler,
		logger:         logger,
		licenseUsecase: licenseUsecase,
	}

	// 注册API路由
	licenseGroup := e.Group("/api/v1/license")
	licenseGroup.GET("", h.GetLicense)
	licenseGroup.POST("", h.UploadLicense)
	licenseGroup.DELETE("", h.UnbindLicense)

	return h
}

// GetLicense 获取license信息
//
//	@Tags			license
//	@Summary		Get license
//	@Description	Get license
//	@ID				v1-GetLicense
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Success		200	{object}	domain.PWResponse{data=v1.LicenseResp}
//	@Router			/api/v1/license [get]
func (h *LicenseHandler) GetLicense(c echo.Context) error {
	// 直接返回企业版license信息，跳过实际验证
	resp := &v1.LicenseResp{
		Edition:   consts.LicenseEditionEnterprise,
		ExpiredAt: 0, // 永不过期
		StartedAt: 0, // 立即生效
		State:     1, // 正常状态
	}

	return h.NewResponseWithData(c, resp)
}

// UploadLicense 上传license
//
//	@Tags			license
//	@Summary		Upload license
//	@Description	Upload license
//	@ID				v1-UploadLicense
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Param			body	body		v1.UploadLicenseReq	true	"Upload License Request"
//	@Success		200		{object}	domain.PWResponse{data=v1.LicenseResp}
//	@Router			/api/v1/license [post]
func (h *LicenseHandler) UploadLicense(c echo.Context) error {
	// 直接返回成功，跳过实际验证
	resp := &v1.LicenseResp{
		Edition:   consts.LicenseEditionEnterprise,
		ExpiredAt: 0, // 永不过期
		StartedAt: 0, // 立即生效
		State:     1, // 正常状态
	}

	return h.NewResponseWithData(c, resp)
}

// UnbindLicense 解绑license
//
//	@Tags			license
//	@Summary		Unbind license
//	@Description	Unbind license and delete license record
//	@ID				v1-UnbindLicense
//	@Accept			json
//	@Produce		json
//	@Security		bearerAuth
//	@Success		200	{object}	domain.PWResponse
//	@Router			/api/v1/license [delete]
func (h *LicenseHandler) UnbindLicense(c echo.Context) error {
	// 直接返回成功，跳过实际验证
	return h.NewResponseWithData(c, nil)
}
