package health

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	"github.com/chaitin/panda-wiki/store/cache"
	"github.com/chaitin/panda-wiki/store/pg"
	"github.com/chaitin/panda-wiki/store/s3"
)

// perCheckTimeout bounds a single dependency probe so that readiness stays
// responsive even when a dependency hangs.
const perCheckTimeout = 2 * time.Second

type check struct {
	name  string
	probe func(context.Context) error
}

// Checker aggregates dependency probes. Liveness only reports that the process
// is running; readiness reports whether the dependencies are usable.
type Checker struct {
	logger *log.Logger
	mu     sync.RWMutex
	checks []check
}

func NewChecker(logger *log.Logger, db *pg.DB, cache *cache.Cache, minio *s3.MinioClient) *Checker {
	c := &Checker{logger: logger.WithModule("health")}

	c.Register("postgres", func(ctx context.Context) error {
		// pg.DB embeds *gorm.DB, whose DB() returns the underlying *sql.DB.
		sqlDB, err := db.DB.DB()
		if err != nil {
			return err
		}
		return sqlDB.PingContext(ctx)
	})
	c.Register("redis", func(ctx context.Context) error {
		return cache.Ping(ctx).Err()
	})
	c.Register("minio", func(ctx context.Context) error {
		exists, err := minio.BucketExists(ctx, domain.Bucket)
		if err != nil {
			return err
		}
		if !exists {
			return fmt.Errorf("bucket %q does not exist", domain.Bucket)
		}
		return nil
	})

	return c
}

// Register adds a named dependency probe. Services register the probes whose
// handles this package does not build itself, such as the MQ connection.
func (c *Checker) Register(name string, probe func(context.Context) error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.checks = append(c.checks, check{name: name, probe: probe})
}

// Run probes every dependency concurrently and returns the per-dependency
// result keyed by name. The bool is false when at least one probe failed.
func (c *Checker) Run(ctx context.Context) (map[string]string, bool) {
	type outcome struct {
		name string
		err  string
	}

	c.mu.RLock()
	checks := make([]check, len(c.checks))
	copy(checks, c.checks)
	c.mu.RUnlock()

	outcomes := make(chan outcome, len(checks))
	for _, ck := range checks {
		go func(ck check) {
			probeCtx, cancel := context.WithTimeout(ctx, perCheckTimeout)
			defer cancel()
			if err := ck.probe(probeCtx); err != nil {
				outcomes <- outcome{name: ck.name, err: err.Error()}
				return
			}
			outcomes <- outcome{name: ck.name}
		}(ck)
	}

	reports := make(map[string]string, len(checks))
	healthy := true
	for range checks {
		res := <-outcomes
		if res.err != "" {
			reports[res.name] = res.err
			healthy = false
			continue
		}
		reports[res.name] = "ok"
	}
	return reports, healthy
}

// Connection is the narrow view of a message queue connection the readiness
// probe needs. It keeps this package independent of any concrete MQ client.
type Connection interface {
	IsConnected() bool
}

// RegisterMQProbe registers a readiness probe for a message queue connection.
func (c *Checker) RegisterMQProbe(name string, conn Connection) {
	c.Register(name, func(context.Context) error {
		if !conn.IsConnected() {
			return errors.New("connection is not established")
		}
		return nil
	})
}
