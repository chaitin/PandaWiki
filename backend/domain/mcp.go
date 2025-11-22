package domain

import (
	"time"
)

type MCPCall struct {
	ID               string    `gorm:"primaryKey;column:id" json:"id,omitempty"`
	ClientName       string    `gorm:"column:client_name" json:"client_name"`
	ClientVersion    string    `gorm:"column:client_version" json:"client_version"`
	Question         string    `gorm:"column:question" json:"question"`
	Document         string    `gorm:"column:document" json:"document"`
	RemoteIP         string    `gorm:"column:remote_ip" json:"remoate_ip"`
	CreatedAt        time.Time `gorm:"column:created_at;not null;default:now()" json:"created_at"`
}
