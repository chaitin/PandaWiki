package v1

import (
	"time"

	"github.com/chaitin/panda-wiki/domain"
)

type ShareNodeListItemReq struct {
}

type ShareNodeListItemResp struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Type      domain.NodeType `json:"type"`
	ParentID  string          `json:"parent_id"`
	Position  float64         `json:"position"`
	Emoji     string          `json:"emoji"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type NodeRecommendListReq struct {
	KbID string `json:"kb_id"`
}

type NodeRecommendListResp struct {
	NodeRecommend []NodeItem `json:"node_recommends"`
	BasicDocs     []NodeItem `json:"basic_docs"`
	DirDocs       []NodeItem `json:"dir_docs"`
	SimpleDocs    []NodeItem `json:"simple_docs"`
}

type NodeItem struct {
	ID             string                          `json:"id"`
	Name           string                          `json:"name"`
	Type           domain.NodeType                 `json:"type"`
	Summary        string                          `json:"summary"`
	ParentID       string                          `json:"parent_id"`
	Position       float64                         `json:"position"`
	Emoji          string                          `json:"emoji"`
	RecommendNodes []*domain.RecommendNodeListResp `json:"recommend_nodes,omitempty" gorm:"-"`
}
