package v1

type ShareFileUploadReq struct {
	KbId         string `json:"-"`
	File         string `form:"file"`
	CaptchaToken string `form:"captcha_token" json:"captcha_token" validate:"required"`
}

type FileUploadResp struct {
	Key string `json:"key"`
}

type ShareFileUploadUrlReq struct {
	KbId         string `json:"-"`
	Url          string `json:"url" validate:"required,url"`
	CaptchaToken string `json:"captcha_token" validate:"required"`
}

type ShareFileUploadUrlResp struct {
	Key string `json:"key"`
}
