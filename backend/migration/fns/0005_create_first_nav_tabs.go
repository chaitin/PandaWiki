package fns

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

type MigrationCreateFirstNavs struct {
	Name   string
	logger *log.Logger
}

func NewMigrationCreateFirstNavs(logger *log.Logger) *MigrationCreateFirstNavs {
	return &MigrationCreateFirstNavs{
		Name:   "0005_create_first_navs",
		logger: logger,
	}
}

func (m *MigrationCreateFirstNavs) Execute(tx *gorm.DB) error {

	var kbs []*domain.KnowledgeBaseListItem
	if err := tx.Model(&domain.KnowledgeBase{}).
		Order("created_at ASC").
		Find(&kbs).Error; err != nil {
		return err
	}

	for _, kb := range kbs {

		nav := &domain.Nav{
			ID:   uuid.New().String(),
			Name: kb.Name,
			KbID: kb.ID,
		}

		if err := tx.Model(&domain.Nav{}).Create(nav).Error; err != nil {
			return err
		}

		if err := tx.Model(&domain.Node{}).
			Where("kb_id = ?", kb.ID).
			Update("nav_id", nav.ID).Error; err != nil {
			return err
		}
	}

	return nil
}
