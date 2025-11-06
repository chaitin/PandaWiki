package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/lib/pq"

	"github.com/chaitin/panda-wiki/consts"
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

const (
	ContentTypeMD   string = "md"
	ContentTypeHTML string = "html"
)

// table: nodes
type Node struct {
	ID          string          `json:"id" gorm:"primaryKey"`
	KBID        string          `json:"kb_id" gorm:"index"`
	Type        NodeType        `json:"type"`
	Status      NodeStatus      `json:"status"`
	RagInfo     RagInfo         `json:"rag_info" gorm:"type:jsonb"`
	Name        string          `json:"name"`
	Content     string          `json:"content"`
	Meta        NodeMeta        `json:"meta" gorm:"type:jsonb"` // summary
	ParentID    string          `json:"parent_id"`
	Position    float64         `json:"position"`
	DocID       string          `json:"doc_id"` // DEPRECATED: for rag service
	CreatorId   string          `json:"creator_id"`
	EditorId    string          `json:"editor_id"`
	EditTime    time.Time       `json:"edit_time"`
	Permissions NodePermissions `json:"permissions" gorm:"type:jsonb"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

func (Node) TableName() string {
	return "nodes"
}

type RagInfo struct {
	Status  consts.NodeRagInfoStatus `json:"status"`
	Message string                   `json:"message"`
}

func (d *RagInfo) Value() (driver.Value, error) {
	return json.Marshal(d)
}

func (d *RagInfo) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid node meta type:", value))
	}
	return json.Unmarshal(bytes, d)
}

type NodePermissions struct {
	Answerable consts.NodeAccessPerm `json:"answerable"` // 可被问答
	Visitable  consts.NodeAccessPerm `json:"visitable"`  // 可被访问
	Visible    consts.NodeAccessPerm `json:"visible"`    // 导航内可见
}

func (s *NodePermissions) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid permissions type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s *NodePermissions) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type NodeAuthGroup struct {
	ID          uint                `json:"id"`
	NodeID      string              `json:"node_id" `
	AuthGroupID int                 `json:"auth_group_id"`
	Perm        consts.NodePermName `json:"perm"`
	CreatedAt   time.Time           `json:"created_at"`
}

func (NodeAuthGroup) TableName() string {
	return "node_auth_groups"
}

type NodeGroupDetail struct {
	NodeID      string              `json:"node_id" `
	AuthGroupId int                 `json:"auth_group_id"`
	Perm        consts.NodePermName `json:"perm"`
	Name        string              `json:"name" gorm:"uniqueIndex;size:100;not null"`
	KbID        string              `gorm:"column:kb_id;not null" json:"kb_id,omitempty"`
	AuthIDs     pq.Int64Array       `json:"auth_ids" gorm:"type:int[]"`
}

type NodeMeta struct {
	Summary     string `json:"summary"`
	Emoji       string `json:"emoji"`
	ContentType string `json:"content_type"`
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

	Emoji       string  `json:"emoji"`
	Summary     *string `json:"summary"`
	ContentType *string `json:"content_type"`

	MaxNode int `json:"-"`

	Position *float64 `json:"position"`
}

type GetNodeListReq struct {
	KBID   string `json:"kb_id" query:"kb_id" validate:"required"`
	Search string `json:"search" query:"search"`
}

type NodeListItemResp struct {
	ID          string          `json:"id"`
	Type        NodeType        `json:"type"`
	Status      NodeStatus      `json:"status"`
	RagInfo     RagInfo         `json:"rag_info"`
	Name        string          `json:"name"`
	Summary     string          `json:"summary"`
	Emoji       string          `json:"emoji"`
	ContentType string          `json:"content_type"`
	Position    float64         `json:"position"`
	ParentID    string          `json:"parent_id"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	CreatorId   string          `json:"creator_id"`
	EditorId    string          `json:"editor_id"`
	Creator     string          `json:"creator"`
	Editor      string          `json:"editor"`
	Permissions NodePermissions `json:"permissions" gorm:"type:jsonb"`
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
	NodeID        string
	NodeName      string
	NodeSummary   string
	NodeEmoji     string
	NodePathNames []string
	Chunks        []*NodeContentChunk
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
	NodeID        string   `json:"node_id"`
	Name          string   `json:"name"`
	Summary       string   `json:"summary"`
	Emoji         string   `json:"emoji"`
	NodePathNames []string `json:"node_path_names"`
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
	Permissions    NodePermissions          `json:"permissions" gorm:"type:jsonb"`
}

type NodeActionReq struct {
	IDs    []string `json:"ids" validate:"required"`
	KBID   string   `json:"kb_id" validate:"required"`
	Action string   `json:"action" validate:"required,oneof=delete"`
}

type UpdateNodeReq struct {
	ID          string   `json:"id" validate:"required"`
	KBID        string   `json:"kb_id" validate:"required"`
	Name        *string  `json:"name"`
	Content     *string  `json:"content"`
	Emoji       *string  `json:"emoji"`
	Summary     *string  `json:"summary"`
	Position    *float64 `json:"position"`
	ContentType *string  `json:"content_type"`
}

type ShareNodeListItemResp struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Type        NodeType        `json:"type"`
	ParentID    string          `json:"parent_id"`
	Position    float64         `json:"position"`
	Emoji       string          `json:"emoji"`
	UpdatedAt   time.Time       `json:"updated_at"`
	Permissions NodePermissions `json:"permissions" gorm:"type:jsonb"`
}

func (n *ShareNodeListItemResp) GetURL(baseURL string) string {
	return fmt.Sprintf("%s/node/%s", baseURL, n.ID)
}

type MoveNodeReq struct {
	ID       string `json:"id" validate:"required"`
	KbID     string `json:"kb_id" validate:"required"`
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
	ID          string `json:"id" gorm:"primaryKey"`
	KBID        string `json:"kb_id" gorm:"index"`
	PublisherId string `json:"publisher_id"`
	EditorId    string `json:"editor_id"`
	NodeID      string `json:"node_id" gorm:"index"`
	DocID       string `json:"doc_id" gorm:"index"` // for rag service

	Type NodeType `json:"type"`

	Name    string   `json:"name"`
	Meta    NodeMeta `json:"meta" gorm:"type:jsonb"`
	Content string   `json:"content"`

	Position float64 `json:"position"`
	ParentID string  `json:"parent_id"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (NodeRelease) TableName() string {
	return "node_releases"
}

// NodeReleaseWithDirPath extends NodeRelease with directory path information
type NodeReleaseWithDirPath struct {
	*NodeRelease
	Path string `json:"path"`
}

type BatchMoveReq struct {
	IDs      []string `json:"ids" validate:"required"`
	KBID     string   `json:"kb_id" validate:"required"`
	ParentID string   `json:"parent_id"`
}

type NodeCreateInfo struct {
	ID        string `json:"id"`
	Account   string `json:"account"`
	CreatorId string `json:"creator_id"`
}

type NodeReleaseWithPublisher struct {
	ID               string `json:"id" gorm:"primaryKey"`
	PublisherId      string `json:"publisher_id"`
	PublisherAccount string `json:"publisher_account"`
}
