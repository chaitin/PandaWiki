package domain

type SiYuanReq struct {
	KBID string `json:"kb_id" validate:"required"`
}
type SiYuanResp struct {
	Id      int    `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}
