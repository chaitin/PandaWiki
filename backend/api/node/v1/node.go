package v1

import (
	"time"

	"github.com/chaitin/panda-wiki/domain"
)

type GetNodeDetailReq struct {
	KbId   string `query:"kb_id" json:"kb_id" validate:"required"`
	ID     string `query:"id" json:"id" validate:"required"`
	Format string `query:"format" json:"format"`
}

type NodeDetailResp struct {
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
	PublisherId      string                 `json:"publisher_id" gorm:"-"`
	CreatorAccount   string                 `json:"creator_account"`
	EditorAccount    string                 `json:"editor_account"`
	PublisherAccount string                 `json:"publisher_account" gorm:"-"`
}

type NodePermissionReq struct {
	KbId string `query:"kb_id" json:"kb_id" validate:"required"`
	ID   string `query:"id" json:"id" validate:"required"`
}

type NodePermissionResp struct {
	ID               string                   `json:"id"`
	Permissions      domain.NodePermissions   `json:"permissions"`
	AnswerableGroups []domain.NodeGroupDetail `json:"answerable_groups"` // 可被问答
	VisitableGroups  []domain.NodeGroupDetail `json:"visitable_groups"`  // 可被访问
	VisibleGroups    []domain.NodeGroupDetail `json:"visible_groups"`    // 导航内可见
}

type NodePermissionEditReq struct {
	KbId             string                  `query:"kb_id" json:"kb_id" validate:"required"`
	IDs              []string                `query:"ids" json:"ids" validate:"required"`
	Permissions      *domain.NodePermissions `json:"permissions"`
	AnswerableGroups *[]int                  `json:"answerable_groups"` // 可被问答
	VisitableGroups  *[]int                  `json:"visitable_groups"`  // 可被访问
	VisibleGroups    *[]int                  `json:"visible_groups"`    // 导航内可见
}

type NodePermissionEditResp struct {
}
