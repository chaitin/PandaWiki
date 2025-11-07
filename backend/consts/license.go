package consts

import (
	"math"

	"github.com/labstack/echo/v4"
)

type contextKey string

const ContextKeyEdition contextKey = "edition"

type LicenseEdition int32

const (
	LicenseEditionFree        LicenseEdition = 0 // 开源版
	LicenseEditionContributor LicenseEdition = 1 // 联创版
	LicenseEditionEnterprise  LicenseEdition = 2 // 企业版
)

func GetLicenseEdition(c echo.Context) LicenseEdition {
	edition, _ := c.Get("edition").(LicenseEdition)
	return LicenseEditionEnterprise
}

func (e LicenseEdition) GetMaxAuth(sourceType SourceType) int {
	switch e {
	case LicenseEditionFree:
		if sourceType == SourceTypeGitHub {
			return 10
		}
		return 0
	case LicenseEditionContributor:
		return 10
	case LicenseEditionEnterprise:
		return math.MaxInt
	default:
		return 0
	}
}
