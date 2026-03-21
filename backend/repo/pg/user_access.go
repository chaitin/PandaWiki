package pg

import (
	"fmt"
	"sync"
	"time"

	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/consts"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type UserAccessRepository struct {
	db        *pg.DB
	logger    *log.Logger
	accessMap sync.Map
}

func NewUserAccessRepository(db *pg.DB, logger *log.Logger) *UserAccessRepository {
	repo := &UserAccessRepository{
		db:        db,
		logger:    logger.WithModule("repo.pg.user_access"),
		accessMap: sync.Map{},
	}
	// start sync task
	go repo.startSyncTask()
	return repo
}

// UpdateAccessTime update user access time
func (r *UserAccessRepository) UpdateAccessTime(userID string) {
	r.accessMap.Store(userID, time.Now())
}

// GetAccessTime get user access time
func (r *UserAccessRepository) GetAccessTime(userID string) (time.Time, bool) {
	if value, ok := r.accessMap.Load(userID); ok {
		return value.(time.Time), true
	}
	return time.Time{}, false
}

// startSyncTask start sync task
func (r *UserAccessRepository) startSyncTask() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		r.syncToDatabase()
	}
}

// syncToDatabase sync data to database
func (r *UserAccessRepository) syncToDatabase() {
	// collect data to update
	updates := make([]domain.UserAccessTime, 0)
	r.accessMap.Range(func(key, value any) bool {
		userID := key.(string)
		timestamp := value.(time.Time)
		updates = append(updates, domain.UserAccessTime{
			UserID:    userID,
			Timestamp: timestamp,
		})
		return true
	})

	if len(updates) == 0 {
		return
	}

	// batch update database
	err := r.db.Transaction(func(tx *gorm.DB) error {
		for _, update := range updates {
			if err := tx.Model(&domain.User{}).
				Where("id = ?", update.UserID).
				Update("last_access", update.Timestamp).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		r.logger.Error("failed to sync user access time to database",
			log.Error(err),
			log.Int("update_count", len(updates)))
		return
	}

	// clear synced data
	for _, update := range updates {
		if currentTime, ok := r.GetAccessTime(update.UserID); ok {
			// only delete old data
			if !currentTime.After(update.Timestamp) {
				r.accessMap.Delete(update.UserID)
			}
		}
	}

	r.logger.Info("synced user access time to database",
		log.Int("update_count", len(updates)))
}

func (r *UserAccessRepository) ValidateRole(userID string, role consts.UserRole) (bool, error) {
	var user domain.User
	if err := r.db.Model(&domain.User{}).Where("id = ?", userID).First(&user).Error; err != nil {
		return false, fmt.Errorf("get user failed")
	}

	if user.Role == consts.UserRoleAdmin {
		return true, nil
	}

	if user.Role == role {
		return true, nil
	}

	return false, nil
}

func (r *UserAccessRepository) ValidateAnyKBPerm(userId string, perm consts.UserKBPermission) (bool, error) {
	var kbUsers []domain.KBUsers
	if err := r.db.Model(&domain.KBUsers{}).
		Where("user_id = ?", userId).
		Find(&kbUsers).Error; err != nil {
		return false, fmt.Errorf("get kb users failed %s", err)
	}
	for _, kbUser := range kbUsers {
		if kbUser.GetPerms().Contains(perm) {
			return true, nil
		}
	}
	return false, nil
}

func (r *UserAccessRepository) ValidateKBPerm(kbId, userId string, perm consts.UserKBPermission) (bool, error) {
	var user domain.User
	if err := r.db.Model(&domain.User{}).Where("id = ?", userId).First(&user).Error; err != nil {
		return false, fmt.Errorf("get user failed %s", err)
	}

	if user.Role == consts.UserRoleAdmin {
		return true, nil
	}

	var kbUser domain.KBUsers
	err := r.db.Model(&domain.KBUsers{}).
		Where("kb_id = ? AND user_id = ?", kbId, userId).
		First(&kbUser).Error
	if err != nil {
		return false, fmt.Errorf("get kb user failed %s", err)
	}

	return kbUser.GetPerms().Contains(perm), nil
}
