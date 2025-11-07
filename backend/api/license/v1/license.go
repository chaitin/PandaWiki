package v1

import "github.com/chaitin/panda-wiki/consts"

// LicenseResp license响应
type LicenseResp struct {
	Edition   consts.LicenseEdition `json:"edition"`
	ExpiredAt int64                 `json:"expired_at"`
	StartedAt int64                 `json:"started_at"`
	State     int                   `json:"state"`
}

// UploadLicenseReq 上传license请求
type UploadLicenseReq struct {
	LicenseEdition consts.LicenseEdition `json:"license_edition" form:"license_edition"`
	LicenseType    string                `json:"license_type" form:"license_type"`
	LicenseCode    string                `json:"license_code" form:"license_code"`
	LicenseFile    string                `json:"license_file" form:"license_file"`
}