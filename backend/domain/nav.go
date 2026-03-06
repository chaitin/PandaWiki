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

// table: nav_releases
type NavRelease struct {
	ID        string    `json:"id" gorm:"primaryKey;type:text"`
	NavID     string    `json:"nav_id" gorm:"column:nav_id;type:text;not null"`
	ReleaseID string    `json:"release_id" gorm:"column:release_id;type:text;not null;index"`
	KbID      string    `json:"kb_id" gorm:"column:kb_id;type:text;not null;index"`
	Name      string    `json:"name" gorm:"column:name;type:text;not null"`
	Position  float64   `json:"position"`
	CreatedAt time.Time `gorm:"column:created_at;type:timestamptz;not null;default:now()"`
}

func (NavRelease) TableName() string {
	return "nav_releases"
}
