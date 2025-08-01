package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/boj/redistore"
	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/store/cache"
	"github.com/google/uuid"
	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"

	"github.com/chaitin/panda-wiki/log"
)

const (
	SessionKey = "SessionKey"
)

type SessionMiddleware struct {
	logger *log.Logger
	store  *redistore.RediStore
}

func NewSessionMiddleware(logger *log.Logger, config *config.Config, cache *cache.Cache) (*SessionMiddleware, error) {

	secretKey, err := cache.GetOrSet(context.Background(), SessionKey, uuid.New().String(), time.Duration(0))
	if err != nil {
		logger.Error("session store create secret key failed: %v", log.Error(err))
		return nil, err
	}

	store, err := redistore.NewRediStore(
		10,
		"tcp",
		config.Redis.Addr,
		"",
		config.Redis.Password,
		[]byte(secretKey.(string)),
	)

	if err != nil {
		logger.Error("init session store failed: %v", log.Error(err))
		return nil, err
	}

	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   int((1 * 24 * time.Hour).Seconds()),
		SameSite: http.SameSiteLaxMode,
	}

	return &SessionMiddleware{
		logger: logger.WithModule("middleware.session"),
		store:  store,
	}, nil
}

func (s *SessionMiddleware) Session() echo.MiddlewareFunc {
	return session.MiddlewareWithConfig(session.Config{
		Store: s.store,
	})
}
