package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

type Comment struct {
	ID string `json:"id" gorm:"primaryKey"`

	KbID      string      `json:"kb_id"`
	UserID    string      `json:"user_id"`
	NodeID    string      `json:"node_id" gorm:"index"`
	Info      CommentInfo `json:"info" gorm:"type:jsonb"`
	ParentID  string      `json:"parent_id"`
	RootID    string      `json:"root_id"`
	Content   string      `json:"content"`
	CreatedAt time.Time   `json:"created_at"`
}

type CommentInfo struct {
	UserName string `json:"user_name"`
	RemoteIP string `json:"remote_ip"`
}

func (d *CommentInfo) Value() (driver.Value, error) {
	return json.Marshal(d)
}

func (d *CommentInfo) Scan(value any) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New(fmt.Sprint("invalid comment info type:", value))
	}
	return json.Unmarshal(bytes, d)
}

// 前端请求
type CommentReq struct {
	NodeID   string `json:"node_id" validate:"required"`
	Content  string `json:"content" validate:"required"`
	UserName string `json:"user_name"`
	ParentID string `json:"parent_id"`
	RootID   string `json:"root_id"`
}

type CommentListReq struct {
	KbID string `json:"kb_id" query:"kb_id" validate:"required"`
	Pager
}

type CommentListItem struct {
	ID        string      `json:"id"`
	NodeID    string      `json:"node_id"`
	RootID    string      `json:"root_id"`
	Info      CommentInfo `json:"info" gorm:"info;type:jsonb"`
	NodeType  int         `json:"node_type"`
	NodeName  string      `json:"node_name"` // 文档标题
	Content   string      `json:"content"`
	IPAddress *IPAddress  `json:"ip_address" gorm:"-"` // ip地址
	CreatedAt time.Time   `json:"created_at"`
}

type DeleteCommentListReq struct {
	IDS []string `json:"ids" query:"ids"`
}

type ShareCommentListItem struct {
	ID string `json:"id" gorm:"primaryKey"`

	KbID      string      `json:"kb_id"`
	NodeID    string      `json:"node_id" gorm:"index"`
	Info      CommentInfo `json:"info" gorm:"type:jsonb"`
	ParentID  string      `json:"parent_id"`
	RootID    string      `json:"root_id"`
	Content   string      `json:"content"`
	IPAddress *IPAddress  `json:"ip_address" gorm:"-"` // ip地址
	CreatedAt time.Time   `json:"created_at"`
}
