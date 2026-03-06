package migration

import (
	"github.com/chaitin/panda-wiki/migration/fns"
)

type MigrationFuncs struct {
	NodeMigration                       *fns.MigrationNodeVersion
	BotAuthMigration                    *fns.MigrationCreateBotAuth
	FixGroupIdsMigration                *fns.MigrationFixGroupIds
	UpdateNodeStatusUnreleasedMigration *fns.MigrationUpdateNodeStatusUnreleased
	CreateFirstNavs                     *fns.MigrationCreateFirstNavs
}

func (mf *MigrationFuncs) GetMigrationFuncs() []MigrationFunc {
	funcs := []MigrationFunc{}
	funcs = append(funcs, MigrationFunc{
		Name: mf.NodeMigration.Name,
		Fn:   mf.NodeMigration.Execute,
	})
	funcs = append(funcs, MigrationFunc{
		Name: mf.BotAuthMigration.Name,
		Fn:   mf.BotAuthMigration.Execute,
	})
	funcs = append(funcs, MigrationFunc{
		Name: mf.FixGroupIdsMigration.Name,
		Fn:   mf.FixGroupIdsMigration.Execute,
	})
	funcs = append(funcs, MigrationFunc{
		Name: mf.UpdateNodeStatusUnreleasedMigration.Name,
		Fn:   mf.UpdateNodeStatusUnreleasedMigration.Execute,
	})
	funcs = append(funcs, MigrationFunc{
		Name: mf.CreateFirstNavs.Name,
		Fn:   mf.CreateFirstNavs.Execute,
	})
	return funcs
}
