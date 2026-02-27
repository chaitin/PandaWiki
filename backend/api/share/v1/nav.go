package v1

type ShareNavListReq struct {
	KbId string `json:"kb_id" query:"kb_id" validate:"required"`
}
