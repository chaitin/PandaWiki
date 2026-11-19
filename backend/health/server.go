package health

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/log"
)

// Server exposes /healthz and /readyz on a dedicated port. It is deliberately
// kept out of the API router so that probe traffic never runs through auth,
// session or request-logging middleware.
type Server struct {
	checker *Checker
	logger  *log.Logger
	srv     *http.Server
}

func NewServer(cfg *config.Config, checker *Checker, logger *log.Logger) *Server {
	s := &Server{
		checker: checker,
		logger:  logger.WithModule("health.server"),
	}
	if cfg.Health.Port == 0 {
		return s
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", s.handleLiveness)
	mux.HandleFunc("/readyz", s.handleReadiness)
	s.srv = &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Health.Port),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	return s
}

// Enabled reports whether a health port was configured.
func (s *Server) Enabled() bool {
	return s.srv != nil
}

// RegisterMQProbe registers a readiness probe for a message queue connection.
// It delegates to the checker so callers only need to hold the server.
func (s *Server) RegisterMQProbe(name string, conn Connection) {
	s.checker.RegisterMQProbe(name, conn)
}

// Start serves until ctx is cancelled, then drains. It is a no-op when no
// health port is configured.
func (s *Server) Start(ctx context.Context) error {
	if s.srv == nil {
		return nil
	}

	errCh := make(chan error, 1)
	go func() {
		if err := s.srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	s.logger.Info("health server started", log.String("addr", s.srv.Addr))

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return s.srv.Shutdown(shutdownCtx)
	}
}

func (s *Server) handleLiveness(w http.ResponseWriter, _ *http.Request) {
	// Liveness must not depend on downstream services: a dependency outage
	// should take the pod out of rotation, not restart it.
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (s *Server) handleReadiness(w http.ResponseWriter, r *http.Request) {
	reports, healthy := s.checker.Run(r.Context())
	if !healthy {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"status":       "unavailable",
			"dependencies": reports,
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":       "ok",
		"dependencies": reports,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// The status line is already committed, so an encode failure can only be
	// reported to the client by the truncated body.
	_ = json.NewEncoder(w).Encode(body)
}
