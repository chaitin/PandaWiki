package usecase

import (
	"bytes"
	"context"
	"image"
	"image/png"
	"log/slog"
	"mime/multipart"
	"strings"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
	repopg "github.com/chaitin/panda-wiki/repo/pg"
	storepg "github.com/chaitin/panda-wiki/store/pg"
)

func TestUploadImageFileRejectsDeniedOriginalAndDetectedExtensions(t *testing.T) {
	for _, denied := range []string{"jpg", "png"} {
		t.Run(denied, func(t *testing.T) {
			// Stub only the settings query; exercise the real multipart upload path.
			db, err := gorm.Open(postgres.Open("host=localhost dbname=unused"), &gorm.Config{DisableAutomaticPing: true})
			if err != nil {
				t.Fatal(err)
			}
			sqlDB, err := db.DB()
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = sqlDB.Close() })
			if err := db.Callback().Query().Replace("gorm:query", func(tx *gorm.DB) {
				setting := tx.Statement.Dest.(*domain.SystemSetting)
				setting.Value = []byte(`{"denied_extensions":["` + denied + `"]}`)
				tx.RowsAffected = 1
			}); err != nil {
				t.Fatal(err)
			}
			logger := &log.Logger{Logger: slog.Default()}
			u := &FileUsecase{logger: logger, systemSettingRepo: repopg.NewSystemSettingRepo(&storepg.DB{DB: db}, logger)}

			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			part, err := writer.CreateFormFile("file", "blocked.JPG")
			if err != nil {
				t.Fatal(err)
			}
			if err := png.Encode(part, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
				t.Fatal(err)
			}
			if err := writer.Close(); err != nil {
				t.Fatal(err)
			}
			form, err := multipart.NewReader(&body, writer.Boundary()).ReadForm(1 << 20)
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { _ = form.RemoveAll() })

			key, err := u.UploadImageFile(context.Background(), "kb", form.File["file"][0])
			if err == nil || !strings.Contains(err.Error(), "'."+denied+"' is not allowed") {
				t.Fatalf("expected denied %s extension, got key=%q err=%v", denied, key, err)
			}
			if key != "" {
				t.Fatalf("rejected upload returned key %q", key)
			}
		})
	}
}
