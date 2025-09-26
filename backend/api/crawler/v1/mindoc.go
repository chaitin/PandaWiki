package v1

type MindocParseReq struct {
	KbID string `json:"kb_id" validate:"required"`
}

type MindocParseItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	URL   string `json:"url"`
}

type MindocParseResp struct {
	ID   string            `json:"id"`
	Docs []MindocParseItem `json:"docs"`
}

type MindocScrapeReq struct {
	KbID  string `json:"kb_id" validate:"required"`
	ID    string `json:"id" validate:"required"`
	DocID string `json:"doc_id" validate:"required"`
}

type MindocScrapeResp struct {
	Content string `json:"content"`
}
