package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// table: knowledge_bases
type KnowledgeBase struct {
	ID   string `json:"id" gorm:"primaryKey"`
	Name string `json:"name"`

	DatasetID string `json:"dataset_id"`

	// public info for public access
	AccessSettings AccessSettings `json:"access_settings" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AccessSettings struct {
	Ports          []int    `json:"ports"`
	SSLPorts       []int    `json:"ssl_ports"`
	PublicKey      string   `json:"public_key"`
	PrivateKey     string   `json:"private_key"`
	Hosts          []string `json:"hosts"`
	BaseURL        string   `json:"base_url"`
	TrustedProxies []string `json:"trusted_proxies"`

	SimpleAuth SimpleAuth `json:"simple_auth"`
}

type SimpleAuth struct {
	Enabled  bool   `json:"enabled"`
	Password string `json:"password"`
}

func (s *AccessSettings) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid access settings value type:", value))
	}
	return json.Unmarshal(bytes, s)
}

func (s AccessSettings) Value() (driver.Value, error) {
	return json.Marshal(s)
}

type CreateKnowledgeBaseReq struct {
	ID         string   `json:"-"`
	Name       string   `json:"name" validate:"required"`
	Ports      []int    `json:"ports"`
	SSLPorts   []int    `json:"ssl_ports"`
	PublicKey  string   `json:"public_key"`
	PrivateKey string   `json:"private_key"`
	Hosts      []string `json:"hosts"`
	MaxKB      int      `json:"-"`
}

type UpdateKnowledgeBaseReq struct {
	ID             string          `json:"id" validate:"required"`
	Name           *string         `json:"name"`
	AccessSettings *AccessSettings `json:"access_settings"`
}

type KnowledgeBaseListItem struct {
	ID   string `json:"id"`
	Name string `json:"name"`

	DatasetID string `json:"dataset_id"`

	AccessSettings AccessSettings `json:"access_settings" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type KnowledgeBaseDetail struct {
	ID   string `json:"id"`
	Name string `json:"name"`

	DatasetID string `json:"dataset_id"`

	AccessSettings AccessSettings `json:"access_settings" gorm:"type:jsonb"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// table: kb_releases
type KBRelease struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	KBID      string    `json:"kb_id" gorm:"index"`
	Tag       string    `json:"tag"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"created_at"`
}

// table: kb_release_node_releases
type KBReleaseNodeRelease struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	KBID          string    `json:"kb_id" gorm:"index"`
	ReleaseID     string    `json:"release_id" gorm:"index"`
	NodeID        string    `json:"node_id"`
	NodeReleaseID string    `json:"node_release_id" gorm:"index"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateKBReleaseReq struct {
	KBID    string   `json:"kb_id" validate:"required"`
	Message string   `json:"message" validate:"required"`
	Tag     string   `json:"tag" validate:"required"`
	NodeIDs []string `json:"node_ids"` // create release after these nodes published
}

type KBReleaseListItemResp struct {
	ID        string    `json:"id"`
	KBID      string    `json:"kb_id"`
	Message   string    `json:"message"`
	Tag       string    `json:"tag"`
	CreatedAt time.Time `json:"created_at"`
}

type GetKBReleaseListReq struct {
	KBID string `json:"kb_id" query:"kb_id" validate:"required"`
	Pager
}

type GetKBReleaseListResp = PaginatedResult[[]KBReleaseListItemResp]
