package pg

import (
	"context"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/pg"
)

type AuthRepo struct {
	db     *pg.DB
	logger *log.Logger
}

func NewAuthRepo(db *pg.DB, logger *log.Logger) *AuthRepo {
	return &AuthRepo{
		db:     db,
		logger: logger,
	}
}

func (r *AuthRepo) GetAuthUserinfoByIDs(ctx context.Context, authIDs []uint) (map[uint]*domain.AuthInfo, error) {
	if len(authIDs) == 0 {
		return nil, nil
	}

	var authUserInfo = []domain.AuthInfo{}
	err := r.db.WithContext(ctx).Table("auths").
		Select("id,user_info as auth_user_info").
		Where("id IN (?) ", authIDs).
		Find(&authUserInfo).Error
	if err != nil {
		return nil, err
	}
	//set map
	result := make(map[uint]*domain.AuthInfo, 0)
	for _, a := range authUserInfo {
		result[a.ID] = &a
	}
	return result, nil
}
