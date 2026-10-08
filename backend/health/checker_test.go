package health

import (
	"context"
	"errors"
	"testing"
	"time"
)

// newTestChecker builds a Checker without the real database, cache and object
// store clients, so the aggregation logic can be exercised on its own.
func newTestChecker() *Checker {
	return &Checker{}
}

func TestRunReportsEveryProbe(t *testing.T) {
	c := newTestChecker()
	c.Register("ok", func(context.Context) error { return nil })
	c.Register("broken", func(context.Context) error { return errors.New("connection refused") })

	reports, healthy := c.Run(context.Background())

	if healthy {
		t.Error("Run reported healthy with a failing probe")
	}
	if got := reports["ok"]; got != "ok" {
		t.Errorf("ok probe reported %q, want %q", got, "ok")
	}
	if got := reports["broken"]; got != "connection refused" {
		t.Errorf("broken probe reported %q, want its error", got)
	}
}

func TestRunHealthyWhenEveryProbePasses(t *testing.T) {
	c := newTestChecker()
	c.Register("a", func(context.Context) error { return nil })
	c.Register("b", func(context.Context) error { return nil })

	reports, healthy := c.Run(context.Background())

	if !healthy {
		t.Errorf("Run reported unhealthy with no failing probe: %v", reports)
	}
	if len(reports) != 2 {
		t.Errorf("got %d reports, want 2", len(reports))
	}
}

// A probe that never returns must not hold the endpoint open: each one gets its
// own deadline, which is what keeps readiness answering when a dependency hangs.
func TestRunBoundsEachProbe(t *testing.T) {
	c := newTestChecker()
	c.Register("hanging", func(ctx context.Context) error {
		<-ctx.Done()
		return ctx.Err()
	})

	done := make(chan struct{})
	var healthy bool
	go func() {
		_, healthy = c.Run(context.Background())
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(perCheckTimeout * 3):
		t.Fatal("Run did not return; a hanging probe was not bounded")
	}
	if healthy {
		t.Error("Run reported healthy although the only probe timed out")
	}
}

// Register is safe to call while readiness is being served: the api registers
// the message queue probe during startup, which can overlap with a probe.
func TestRegisterIsSafeWhileRunning(t *testing.T) {
	c := newTestChecker()
	c.Register("initial", func(context.Context) error { return nil })

	stop := make(chan struct{})
	go func() {
		for {
			select {
			case <-stop:
				return
			default:
				c.Run(context.Background())
			}
		}
	}()

	for range 50 {
		c.Register("concurrent", func(context.Context) error { return nil })
	}
	close(stop)
}
