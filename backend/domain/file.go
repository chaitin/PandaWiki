package domain

const (
	Bucket = "static-file"
)

type ObjectUploadResp struct {
	Key      string `json:"key"`
	Filename string `json:"filename"`
}

type UploadByUrlReq struct {
	KbId string `json:"kb_id"`
	Url  string `json:"url" validate:"required,url"`
}

type AnydocUploadResp struct {
	Code uint   `json:"code"`
	Err  string `json:"err"`
	Data string `json:"data"`
}
