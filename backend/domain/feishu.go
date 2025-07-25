package domain

type FeishuBaseReq struct {
	UserAccessToken string `json:"user_access_token"`
	AppID           string `json:"app_id"`
	AppSecret       string `json:"app_secret"`
}
type GetSpaceListReq struct {
	FeishuBaseReq
}
type GetSpaceListResp struct {
	Name    string `json:"name"`
	SpaceId string `json:"space_id"`
}

type SearchWikiReq struct {
	FeishuBaseReq
	SpaceId string `json:"space_id"`
	Query   string `json:"query"`
}

type SearchWikiTemp struct {
	Title     string `json:"title"`
	Url       string `json:"url"`
	SpaceId   string `json:"space_id"`
	ObjToken  string `json:"obj_token"`
	ObjType   int    `json:"obj_type"`
	NodeToken string `json:"node_token"`
	HasChild  bool   `json:"has_child"`
}
type SearchWikiResp struct {
	Title    string `json:"title"`
	Url      string `json:"url"`
	SpaceId  string `json:"space_id"`
	ObjToken string `json:"obj_token"`
	ObjType  int    `json:"obj_type"`
}

type GetDocxReq struct {
	FeishuBaseReq
	KBID    string   `json:"kb_id" validate:"required"`
	Sources []Source `json:"sources" validate:"required"`
}
type Source struct {
	Url      string `json:"url"`
	ObjToken string `json:"obj_token"`
	ObjType  int    `json:"obj_type"`
}
type GetDocxResp struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type SearchDocxReq struct {
	FeishuBaseReq
}

type SearchDocxResp struct {
	Name     string `json:"name"`
	Url      string `json:"url"`
	ObjToken string `json:"obj_token"`
	ObjType  int    `json:"obj_type"`
}
