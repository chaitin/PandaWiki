package pg

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	migratePG "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/chaitin/panda-wiki/config"
)

type DB struct {
	*gorm.DB
}

func NewDB(config *config.Config) (*DB, error) {
	dsn := config.PG.DSN
	// same as gorm logger.Default, but without colorful output and ignore record not found error
	newLogger := logger.New(log.New(os.Stdout, "\r\n", log.LstdFlags), logger.Config{
		SlowThreshold:             200 * time.Millisecond,
		LogLevel:                  logger.Warn,
		IgnoreRecordNotFoundError: true,
		Colorful:                  false,
	})
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		TranslateError: true,
		Logger:         newLogger,
	})
	if err != nil {
		return nil, err
	}
	if config.PG.CreateRagliteDB {
		if err := createRagliteDB(db); err != nil {
			return nil, err
		}
	}
	if config.PG.AutoMigrate {
		if err := doMigrate(dsn); err != nil {
			return nil, err
		}
	}

	return &DB{DB: db}, nil
}

// createRagliteDB makes sure the raglite database exists. This is a
// check-then-act, so instances starting at the same time can race; a concurrent
// creation is therefore treated as success rather than as a startup failure.
func createRagliteDB(db *gorm.DB) error {
	var exists bool
	if err := db.Raw("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'raglite')").Scan(&exists).Error; err != nil {
		return err
	}
	if exists {
		return nil
	}
	if err := db.Exec("CREATE DATABASE raglite").Error; err != nil {
		// Postgres answers SQLSTATE 42P04 here. It is matched by message
		// instead of by error type so that this stays independent of the
		// driver's error implementation.
		if errors.Is(err, gorm.ErrDuplicatedKey) || strings.Contains(err.Error(), "already exists") {
			return nil
		}
		return err
	}
	return nil
}

func doMigrate(dsn string) error {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("open db failed: %w", err)
	}
	driver, err := migratePG.WithInstance(db, &migratePG.Config{})
	if err != nil {
		return fmt.Errorf("with instance failed: %w", err)
	}
	m, err := migrate.NewWithDatabaseInstance(
		"file://migration",
		"postgres", driver)
	if err != nil {
		return fmt.Errorf("new with database instance failed: %w", err)
	}
	if err := m.Up(); err != nil {
		if err == migrate.ErrNoChange {
			return nil
		}
		return fmt.Errorf("migrate db failed: %w", err)
	}

	return nil
}
