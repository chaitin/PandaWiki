package pg

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
	"gorm.io/gorm"
)

type CategoryPromptRepo struct {
	db     *pg.DB
	logger *log.Logger
}

type categoryPromptsJSON struct {
	Items []domain.CategoryPromptItem `json:"items"`
}

func NewCategoryPromptRepo(db *pg.DB, logger *log.Logger) *CategoryPromptRepo {
	return &CategoryPromptRepo{db: db, logger: logger}
}

func (r *CategoryPromptRepo) GetByKBID(ctx context.Context, kbID string) ([]domain.CategoryPromptItem, error) {
	var setting domain.Setting
	err := r.db.WithContext(ctx).Table("settings").
		Where("kb_id = ? AND key = ?", kbID, domain.SettingKeyCategoryPrompts).
		First(&setting).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	var payload categoryPromptsJSON
	if err := json.Unmarshal(setting.Value, &payload); err != nil {
		return nil, err
	}
	return payload.Items, nil
}

func (r *CategoryPromptRepo) ReplaceForKBID(ctx context.Context, kbID string, items []domain.CategoryPromptItem) error {
	payload := categoryPromptsJSON{Items: items}
	b, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var existing domain.Setting
	err = r.db.WithContext(ctx).Table("settings").
		Where("kb_id = ? AND key = ?", kbID, domain.SettingKeyCategoryPrompts).
		First(&existing).Error
	now := time.Now()
	if errors.Is(err, gorm.ErrRecordNotFound) {
		row := domain.Setting{
			KBID:        kbID,
			Key:         domain.SettingKeyCategoryPrompts,
			Value:       b,
			Description: "品类提示词",
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		return r.db.WithContext(ctx).Table("settings").Create(&row).Error
	}
	if err != nil {
		return err
	}
	return r.db.WithContext(ctx).Table("settings").
		Where("kb_id = ? AND key = ?", kbID, domain.SettingKeyCategoryPrompts).
		Updates(map[string]interface{}{
			"value":      b,
			"updated_at": now,
		}).Error
}
