package domain

import (
	"context"
	"time"

	"github.com/chaitin/panda-wiki/consts"
)

type APIToken struct {
	ID         string                  `json:"id" gorm:"primaryKey"`
	Name       string                  `json:"name" gorm:"not null"`
	UserID     string                  `json:"user_id" gorm:"not null"`
	Token      string                  `json:"token" gorm:"uniqueIndex;not null"`
	KbId       string                  `json:"kb_id" gorm:"not null"`
	Permission consts.UserKBPermission `json:"permission" gorm:"not null"`
	CreatedAt  time.Time               `json:"created_at"`
	UpdatedAt  time.Time               `json:"updated_at"`
}

func (APIToken) TableName() string {
	return "api_tokens"
}

type CtxAuthInfo struct {
	IsToken    bool
	Permission consts.UserKBPermission
	UserId     string
	KBId       string
}

type contextKey string

const (
	CtxAuthInfoKey contextKey = "ctx_auth_info"
)

func GetAuthInfoFromCtx(c context.Context) *CtxAuthInfo {
	v := c.Value(CtxAuthInfoKey)
	if v == nil {
		return nil
	}
	ctxAuthInfo, ok := v.(*CtxAuthInfo)
	if !ok {
		return nil
	}
	return ctxAuthInfo
}

func GetUserIDFromContext(ctx context.Context) (string, bool) {
	authInfo := GetAuthInfoFromCtx(ctx)
	if authInfo == nil || authInfo.UserId == "" {
		return "", false
	}
	return authInfo.UserId, true
}

func IsTokenFromContext(ctx context.Context) bool {
	authInfo := GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return false
	}
	return authInfo.IsToken
}

func GetPermissionFromContext(ctx context.Context) (consts.UserKBPermission, bool) {
	authInfo := GetAuthInfoFromCtx(ctx)
	if authInfo == nil {
		return consts.UserKBPermissionNull, false
	}
	return authInfo.Permission, true
}
