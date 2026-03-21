package v1

import (
	"github.com/lib/pq"

	"github.com/chaitin/panda-wiki/consts"
)

type KBUserListReq struct {
	KBId string `json:"kb_id" query:"kb_id"`
}

type KBUserListItemResp struct {
	ID      string          `json:"id"`
	Account string          `json:"account"`
	Role    consts.UserRole `json:"role"`
	Perms   pq.StringArray  `json:"perms" gorm:"type:text[];column:perms"`
}

type KBUserInviteReq struct {
	KBId   string   `json:"kb_id" validate:"required"`
	UserId string   `json:"user_id" validate:"required"`
	Perms  []string `json:"perms" validate:"required,min=1"`
}

type KBUserInviteResp struct {
}

type KBUserUpdateReq struct {
	KBId   string   `json:"kb_id" validate:"required"`
	UserId string   `json:"user_id" validate:"required"`
	Perms  []string `json:"perms" validate:"required,min=1"`
}

type KBUserUpdateResp struct {
}

type KBUserDeleteReq struct {
	KBId   string `json:"kb_id" query:"kb_id" validate:"required"`
	UserId string `json:"user_id" query:"user_id" validate:"required"`
}

type KBUserDeleteResp struct {
}
