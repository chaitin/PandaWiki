package log

import (
	"log/slog"
	"os"

	"github.com/chaitin/panda-wiki/config"
)

type Logger struct {
	*slog.Logger
}

func NewLogger(config *config.Config) *Logger {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.Level(config.Log.Level)}))
	return &Logger{logger}
}

func (l *Logger) WithModule(module string) *Logger {
	return &Logger{l.With(slog.String("module", module))}
}

func Any(key string, value any) slog.Attr {
	return slog.Any(key, value)
}

func String(key string, value string) slog.Attr {
	return slog.String(key, value)
}

func Int(key string, value int) slog.Attr {
	return slog.Int(key, value)
}

func Int64(key string, value int64) slog.Attr {
	return slog.Int64(key, value)
}

func Error(err error) slog.Attr {
	return slog.Any("error", err)
}
