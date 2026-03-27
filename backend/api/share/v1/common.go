package v1

type ShareFileUploadReq struct {
	KbId         string `json:"-"`
	File         string `form:"file"`
	CaptchaToken string `form:"captcha_token" json:"captcha_token"`
}

type FileUploadResp struct {
	Key string `json:"key"`
}
