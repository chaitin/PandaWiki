package v1

import (
	"time"

	"github.com/chaitin/panda-wiki/domain"
)

type ShareNodeDetailResp struct {
	ID               string                 `json:"id"`
	KbID             string                 `json:"kb_id"`
	Type             domain.NodeType        `json:"type"`
	Status           domain.NodeStatus      `json:"status"`
	Name             string                 `json:"name"`
	Content          string                 `json:"content"`
	Meta             domain.NodeMeta        `json:"meta"`
	ParentID         string                 `json:"parent_id"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
	Permissions      domain.NodePermissions `json:"permissions"`
	CreatorId        string                 `json:"creator_id"`
	EditorId         string                 `json:"editor_id"`
	PublisherId      string                 `json:"publisher_id"`
	CreatorAccount   string                 `json:"creator_account"`
	EditorAccount    string                 `json:"editor_account"`
	PublisherAccount string                 `json:"publisher_account"`
}
