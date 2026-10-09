package usecase

import "testing"

func TestSafeRemoteContentTypeRejectsPolyglotPDF(t *testing.T) {
	payload := []byte("%PDF-1.7\n1 0 obj\n<</Type/Catalog>>\nendobj\n")

	_, _, err := safeRemoteContentType(payload)
	if err == nil {
		t.Fatal("expected PDF content fetched from a remote URL to be rejected")
	}
}

func TestSafeRemoteContentTypeAcceptsPNG(t *testing.T) {
	payload := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	}

	contentType, ext, err := safeRemoteContentType(payload)
	if err != nil {
		t.Fatalf("expected PNG content to be accepted: %v", err)
	}
	if contentType != "image/png" || ext != ".png" {
		t.Fatalf("unexpected stored type: %s %s", contentType, ext)
	}
}
