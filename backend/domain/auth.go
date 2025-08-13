package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/chaitin/panda-wiki/consts"
)

type AuthType string

const (
	SessionCacheKey = "_session_store"
	SessionName     = "_pw_auth_session"

	AuthTypeNull       AuthType = ""           // 无认证
	AuthTypeSimple     AuthType = "simple"     // 简单口令
	AuthTypeEnterprise AuthType = "enterprise" // 企业认证
)

type AuthGetReq struct {
}

type AuthGetResp struct {
	AuthType   AuthType          `json:"auth_type"`
	SourceType consts.SourceType `json:"source_type"`
}

type AuthLoginSimpleReq struct {
	Password string `json:"password" validate:"required"`
}

type AuthLoginSimpleResp struct {
}

type AuthInfo struct {
	ID           uint         `gorm:"column:id" json:"id,omitempty"`
	AuthUserInfo AuthUserInfo `json:"auth_user_info" gorm:"type:jsonb"`
}

type AuthUserInfo struct {
	Username  string `json:"username,omitempty"`
	AvatarUrl string `json:"avatar_url,omitempty"`
	Email     string `json:"email,omitempty"`
}

func (s *AuthUserInfo) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid user info type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s *AuthUserInfo) Value() (driver.Value, error) {
	return json.Marshal(s)
}
