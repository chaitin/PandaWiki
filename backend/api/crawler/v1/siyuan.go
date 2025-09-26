package v1

type SiyuanParseReq struct {
	KbID string `json:"kb_id" validate:"required"`
}

type SiyuanParseItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

type SiyuanParseResp struct {
	ID   string            `json:"id"`
	Docs []SiyuanParseItem `json:"docs"`
}

type SiyuanScrapeReq struct {
	KbID  string `json:"kb_id" validate:"required"`
	ID    string `json:"id" validate:"required"`
	DocID string `json:"doc_id" validate:"required"`
}

type SiyuanScrapeResp struct {
	Content string `json:"content"`
}
