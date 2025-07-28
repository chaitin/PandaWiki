package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

const (
	MaxPosition    float64 = 1e38
	MinPositionGap float64 = 1e-5
)

type NodeType uint16

const (
	NodeTypeFolder   NodeType = 1
	NodeTypeDocument NodeType = 2
)

type NodeStatus uint16

const (
	NodeStatusDraft    NodeStatus = 1
	NodeStatusReleased NodeStatus = 2
)

type NodeVisibility uint16

const (
	NodeVisibilityPrivate NodeVisibility = 1
	NodeVisibilityPublic  NodeVisibility = 2
)

// table: nodes
type Node struct {
	ID string `json:"id" gorm:"primaryKey"`

	KBID string `json:"kb_id" gorm:"index"`

	Type NodeType `json:"type"`

	Status     NodeStatus     `json:"status"`
	Visibility NodeVisibility `json:"visibility"`

	Name    string   `json:"name"`
	Content string   `json:"content"`
	Meta    NodeMeta `json:"meta" gorm:"type:jsonb"` // summary

	ParentID string  `json:"parent_id"`
	Position float64 `json:"position"`

	DocID string `json:"doc_id"` // DEPRECATED: for rag service

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NodeMeta struct {
	Summary string `json:"summary"`
	Emoji   string `json:"emoji"`
}

func (d *NodeMeta) Value() (driver.Value, error) {
	return json.Marshal(d)
}

func (d *NodeMeta) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid node meta type:", value))
	}
	return json.Unmarshal(bytes, d)
}

type CreateNodeReq struct {
	KBID     string   `json:"kb_id" validate:"required"`
	ParentID string   `json:"parent_id"`
	Type     NodeType `json:"type" validate:"required,oneof=1 2"`

	Name    string `json:"name" validate:"required"`
	Content string `json:"content"`

	Emoji      string          `json:"emoji"`
	Visibility *NodeVisibility `json:"visibility"`

	MaxNode int `json:"-"`
}

type GetNodeListReq struct {
	KBID   string `json:"kb_id" query:"kb_id" validate:"required"`
	Search string `json:"search" query:"search"`
}

type NodeListItemResp struct {
	ID         string         `json:"id"`
	Type       NodeType       `json:"type"`
	Status     NodeStatus     `json:"status"`
	Visibility NodeVisibility `json:"visibility"`
	Name       string         `json:"name"`
	Summary    string         `json:"summary"`
	Emoji      string         `json:"emoji"`
	Position   float64        `json:"position"`
	ParentID   string         `json:"parent_id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

type NodeDetailResp struct {
	ID   string `json:"id"`
	KBID string `json:"kb_id"`

	Type       NodeType       `json:"type"`
	Status     NodeStatus     `json:"status"`
	Visibility NodeVisibility `json:"visibility"`
	Name       string         `json:"name"`
	Content    string         `json:"content"`
	Meta       NodeMeta       `json:"meta"`

	ParentID string `json:"parent_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type NodeContentChunk struct {
	ID    string `json:"id"`
	KBID  string `json:"kb_id"`
	DocID string `json:"doc_id"`

	Seq     uint   `json:"seq"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type RankedNodeChunks struct {
	NodeID      string
	NodeName    string
	NodeSummary string
	Chunks      []*NodeContentChunk
}

func (n *RankedNodeChunks) GetURL(baseURL string) string {
	return fmt.Sprintf("%s/node/%s", baseURL, n.NodeID)
}

type ChunkListItemResp struct {
	ID      string `json:"id"`
	Seq     uint   `json:"seq"`
	Name    string `json:"name"`
	Content string `json:"content"`
}

type NodeContentChunkSSE struct {
	NodeID  string `json:"node_id"`
	Name    string `json:"name"`
	Summary string `json:"summary"`
}

type RecommendNodeListResp struct {
	ID             string                   `json:"id"`
	Name           string                   `json:"name"`
	Type           NodeType                 `json:"type"`
	Summary        string                   `json:"summary"`
	ParentID       string                   `json:"parent_id"`
	Position       float64                  `json:"position"`
	Emoji          string                   `json:"emoji"`
	RecommendNodes []*RecommendNodeListResp `json:"recommend_nodes,omitempty" gorm:"-"`
}

type NodeActionReq struct {
	IDs    []string `json:"ids" validate:"required"`
	KBID   string   `json:"kb_id" validate:"required"`
	Action string   `json:"action" validate:"required,oneof=delete private public"`
}

type UpdateNodeReq struct {
	ID         string          `json:"id" validate:"required"`
	KBID       string          `json:"kb_id" validate:"required"`
	Name       *string         `json:"name"`
	Content    *string         `json:"content"`
	Emoji      *string         `json:"emoji"`
	Visibility *NodeVisibility `json:"visibility"`
	Summary    *string         `json:"summary"`
}

type ShareNodeListItemResp struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Type      NodeType  `json:"type"`
	ParentID  string    `json:"parent_id"`
	Position  float64   `json:"position"`
	Emoji     string    `json:"emoji"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (n *ShareNodeListItemResp) GetURL(baseURL string) string {
	return fmt.Sprintf("%s/node/%s", baseURL, n.ID)
}

type MoveNodeReq struct {
	ID       string `json:"id" validate:"required"`
	ParentID string `json:"parent_id"`
	PrevID   string `json:"prev_id"`
	NextID   string `json:"next_id"`
}

type NodeSummaryReq struct {
	IDs  []string `json:"ids" validate:"required"`
	KBID string   `json:"kb_id" validate:"required"`
}

type GetRecommendNodeListReq struct {
	KBID    string   `json:"kb_id" validate:"required" query:"kb_id"`
	NodeIDs []string `json:"node_ids" validate:"required" query:"node_ids[]"`
}

// table: node_releases
type NodeRelease struct {
	ID     string `json:"id" gorm:"primaryKey"`
	KBID   string `json:"kb_id" gorm:"index"`
	NodeID string `json:"node_id" gorm:"index"`
	DocID  string `json:"doc_id" gorm:"index"` // for rag service

	Type       NodeType       `json:"type"`
	Visibility NodeVisibility `json:"visibility"`

	Name    string   `json:"name"`
	Meta    NodeMeta `json:"meta" gorm:"type:jsonb"`
	Content string   `json:"content"`

	Position float64 `json:"position"`
	ParentID string  `json:"parent_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type BatchMoveReq struct {
	IDs      []string `json:"ids" validate:"required"`
	KBID     string   `json:"kb_id" validate:"required"`
	ParentID string   `json:"parent_id"`
}

type NodeReleaseListItem struct {
	ID        string    `json:"id"`
	NodeID    string    `json:"node_id"`
	Name      string    `json:"name"`
	Meta      NodeMeta  `json:"meta"`
	UpdatedAt time.Time `json:"updated_at"`
	// release
	ReleaseID      string `json:"release_id"`
	ReleaseTag     string `json:"release_name" gorm:"-"`
	ReleaseMessage string `json:"release_message" gorm:"-"`
}

type GetNodeReleaseListReq struct {
	KBID   string `json:"kb_id" validate:"required" query:"kb_id"`
	NodeID string `json:"node_id" validate:"required" query:"node_id"`
}

type GetNodeReleaseDetailReq struct {
	ID string `json:"id" validate:"required" query:"id"`
}

type GetNodeReleaseDetailResp struct {
	Name    string   `json:"name"`
	Meta    NodeMeta `json:"meta"`
	Content string   `json:"content"`
}
