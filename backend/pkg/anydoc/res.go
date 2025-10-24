package anydoc

type GetUrlListResponse struct {
	Success bool           `json:"success"`
	Data    GetUrlListData `json:"data"`
	Msg     string         `json:"msg"`
	Err     string         `json:"err"`
	TraceId interface{}    `json:"trace_id"`
}
type GetUrlListData struct {
	Docs []struct {
		Id       string `json:"id"`
		FileType string `json:"file_type"`
		Title    string `json:"title"`
		Summary  string `json:"summary"`
	} `json:"docs"`
}

type UrlExportRes struct {
	Success bool        `json:"success"`
	Data    string      `json:"data"`
	Msg     string      `json:"msg"`
	Err     string      `json:"err"`
	TraceId interface{} `json:"trace_id"`
}
type TaskRes struct {
	Success bool `json:"success"`
	Data    []struct {
		TaskId     string `json:"task_id"`
		PlatformId string `json:"platform_id"`
		DocId      string `json:"doc_id"`
		Status     Status `json:"status"`
		Err        string `json:"err"`
		Markdown   string `json:"markdown"`
		Json       string `json:"json"`
	} `json:"data"`
	Msg string `json:"msg"`
}

type ListDocResponse struct {
	Success bool         `json:"success"`
	Data    ListDocsData `json:"data"`
	Msg     string       `json:"msg"`
	Err     string       `json:"err"`
	TraceID string       `json:"trace_id"`
}

type ListDocsData struct {
	Docs Child `json:"docs"`
}

type Value struct {
	ID       string `json:"id"`
	File     bool   `json:"file"`
	FileType string `json:"file_type"`
	Title    string `json:"title"`
	Summary  string `json:"summary"`
}

type Child struct {
	Value    Value   `json:"value"`
	Children []Child `json:"children"`
}
