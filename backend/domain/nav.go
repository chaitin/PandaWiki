package domain

import "time"

type Nav struct {
	ID        string    `json:"id" gorm:"primaryKey;type:text"`
	Name      string    `json:"name" gorm:"column:name;type:text;not null"`
	KbID      string    `json:"kb_id" gorm:"column:kb_id;type:text;not null"`
	Position  float64   `json:"position"`
	CreatedAt time.Time `gorm:"column:created_at;type:timestamptz;not null;default:now()"`
	UpdatedAt time.Time `gorm:"column:updated_at;type:timestamptz;not null;default:now()"`
}

func (Nav) TableName() string {
	return "navs"
}
