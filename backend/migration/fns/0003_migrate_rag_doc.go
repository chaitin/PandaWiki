package fns

import (
	"context"

	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/usecase"
)

type MigrationRagDoc struct {
	Name         string
	logger       *log.Logger
	modelUsecase *usecase.ModelUsecase
}

func NewMigrationRagDoc(logger *log.Logger, modelUsecase *usecase.ModelUsecase) *MigrationRagDoc {
	return &MigrationRagDoc{
		Name:         "0003_migrate_rag_doc",
		logger:       logger,
		modelUsecase: modelUsecase,
	}
}

func (m *MigrationRagDoc) Execute(tx *gorm.DB) error {
	ctx := context.Background()
	if err := m.modelUsecase.TriggerUpsertRecords(ctx); err != nil {
		m.logger.Error("migrate rag doc failed", log.Error(err))
		return nil
	}
	m.logger.Info("migrate rag doc completed successfully")
	return nil
}
