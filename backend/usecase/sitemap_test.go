package usecase

import (
	"strings"
	"testing"
	"time"
)

func TestEscapeSitemapLocationEscapesXMLMetaCharacters(t *testing.T) {
	location := `https://docs.example.com/welcome?a=1&b=2<script>`

	escaped := escapeSitemapLocation(location)

	if strings.Contains(escaped, "&b=") || strings.Contains(escaped, "<script>") {
		t.Fatalf("location was not XML-escaped: %s", escaped)
	}
	if !strings.Contains(escaped, "&amp;b=2") || !strings.Contains(escaped, "&lt;script&gt;") {
		t.Fatalf("unexpected escaped location: %s", escaped)
	}
}

func TestWriteSitemapURLWritesEscapedLocation(t *testing.T) {
	var sb strings.Builder

	writeSitemapURL(&sb, `https://docs.example.com/node/1?q=a&b=b`, time.Date(2026, 10, 9, 0, 0, 0, 0, time.UTC))

	got := sb.String()
	if strings.Contains(got, "&b=b") {
		t.Fatalf("sitemap URL contains unescaped query separator: %s", got)
	}
	if !strings.Contains(got, "<loc>https://docs.example.com/node/1?q=a&amp;b=b</loc>") {
		t.Fatalf("unexpected sitemap entry: %s", got)
	}
}
