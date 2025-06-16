package domain

type EpubReq struct {
	KbID string `json:"kb_id"`
}

type EpubResp struct {
	Content string `json:"content"`
	Title   string `json:"title"`
}
