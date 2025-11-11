package usecase

import (
	"github.com/chaitin/panda-wiki/api/license/v1"
	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/log"
)

type LicenseUsecase struct {
	logger *log.Logger
}

func NewLicenseUsecase(logger *log.Logger) (*LicenseUsecase, error) {
	return &LicenseUsecase{
		logger: logger.WithModule("usecase.license"),
	}, nil
}

// GetLicense 获取license信息
func (u *LicenseUsecase) GetLicense() (*v1.LicenseResp, error) {
	// 直接返回企业版license信息，跳过实际验证
	resp := &v1.LicenseResp{
		Edition:   consts.LicenseEditionEnterprise,
		ExpiredAt: 0, // 永不过期
		StartedAt: 0, // 立即生效
		State:     1, // 正常状态
	}

	return resp, nil
}

// UploadLicense 上传license
func (u *LicenseUsecase) UploadLicense(req *v1.UploadLicenseReq) (*v1.LicenseResp, error) {
	// 直接返回成功，跳过实际验证
	resp := &v1.LicenseResp{
		Edition:   consts.LicenseEditionEnterprise,
		ExpiredAt: 0, // 永不过期
		StartedAt: 0, // 立即生效
		State:     1, // 正常状态
	}

	return resp, nil
}

// UnbindLicense 解绑license
func (u *LicenseUsecase) UnbindLicense() error {
	// 直接返回成功，跳过实际验证
	return nil
}