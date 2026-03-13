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
	NavId            string                 `json:"nav_id"`
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
	PV               int64                  `json:"pv" gorm:"-"`
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

type NodeRestudyReq struct {
	NodeIds []string `json:"node_ids" validate:"required,min=1"`
	KbId    string   `json:"kb_id" validate:"required"`
}

type NodeRestudyResp struct {
}

type NodeStatsReq struct {
	KbId string `query:"kb_id" json:"kb_id" validate:"required"`
}

type NodeStatsResp struct {
	UnpublishedCount   int64 `json:"unpublished_count"`    // 未发布的文档数
	UnstudiedCount     int64 `json:"unstudied_count"`      // 未学习的文档数
	UnreleasedNavCount int64 `json:"unreleased_nav_count"` // 未发布目录数量
}

type NodeMoveNavReq struct {
	IDs   []string `json:"ids" query:"[]ids" validate:"required,min=1"`
	KbID  string   `json:"kb_id" validate:"required"`
	NavID string   `json:"nav_id" validate:"required"`
}

type NodeListGroupNavReq struct {
	KbId   string `json:"kb_id" query:"kb_id" validate:"required"`
	Search string `json:"search" query:"search"`
	Status string `json:"status" query:"status" validate:"omitempty,oneof=unpublished unstudied"`
}

type NodeListGroupNavResp struct {
	NavName    string                    `json:"nav_name"`
	NavID      string                    `json:"nav_id"`
	Position   float64                   `json:"position"`
	Count      int64                     `json:"count"`
	IsReleased bool                      `json:"is_released"`
	List       []domain.NodeListItemResp `json:"list"`
}
