package domain

import (
	"time"

	"github.com/chaitin/panda-wiki/consts"
)

type Contribute struct {
	Id          string                  `json:"id" gorm:"primaryKey;type:text"`
	AuthId      *int64                  `json:"auth_id"`
	KBId        string                  `json:"kb_id" gorm:"type:text;not null"`
	Status      consts.ContributeStatus `json:"status" gorm:"type:text;not null"`
	Type        consts.ContributeType   `json:"type" gorm:"type:text;not null"`
	NodeId      string                  `json:"node_id" gorm:"type:text"`
	Name        string                  `json:"name" gorm:"type:text"`
	Content     string                  `json:"content" gorm:"type:text;not null"`
	Meta        NodeMeta                `json:"meta"`
	Reason      string                  `json:"reason" gorm:"type:text;not null"`
	AuditUserID string                  `json:"audit_user_id" gorm:"type:text;not null"`
	AuditTime   *time.Time              `json:"audit_time"`
	RemoteIP    string                  `json:"remote_ip" gorm:"type:text;not null"`
	CreatedAt   time.Time               `gorm:"column:created_at;not null;default:now()"`
	UpdatedAt   time.Time               `gorm:"column:updated_at;not null;default:now()"`
}

func (Contribute) TableName() string {
	return "contributes"
}
