package v1

import "time"

type NavListReq struct {
	KbId string `json:"kb_id" query:"kb_id" validate:"required"`
}

type NavAddReq struct {
	KbId     string   `json:"kb_id" query:"kb_id" validate:"required"`
	Name     string   `json:"name" validate:"required"`
	Position *float64 `json:"position"`
}

type NavUpdateReq struct {
	KbId string `json:"kb_id" query:"kb_id" validate:"required"`
	ID   string `json:"id" validate:"required"`
	Name string `json:"name" validate:"required"`
}

type NavDeleteReq struct {
	KbId string `json:"kb_id" query:"kb_id" validate:"required"`
	ID   string `json:"id" query:"id" validate:"required"`
}

type NavMoveReq struct {
	KbId   string `json:"kb_id" validate:"required"`
	ID     string `json:"id" validate:"required"`
	PrevID string `json:"prev_id"`
	NextID string `json:"next_id"`
}

type NavListResp struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Position  float64   `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
