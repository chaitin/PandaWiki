package usecase

import (
	"reflect"
	"strings"
	"testing"

	"github.com/chaitin/panda-wiki/domain"
)

func TestParseWorkModeMissingAttributes_CodeFence(t *testing.T) {
	raw := "```json\n{\"missing_attributes\":[\"尺寸\"]}\n```"
	attrs := []string{"尺寸", "颜色"}
	got := parseWorkModeMissingAttributes(raw, attrs)
	want := []string{"尺寸"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
}

func TestParseWorkModeMissingAttributes_JSONObject(t *testing.T) {
	raw := `{"missing_attributes":["尺寸","颜色"]}`
	attrs := []string{"尺寸", "颜色", "材质"}
	got := parseWorkModeMissingAttributes(raw, attrs)
	want := []string{"尺寸", "颜色"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
}

func TestParseWorkModeMissingAttributes_FiltersUnknown(t *testing.T) {
	raw := `{"missing_attributes":["尺寸","虚构"]}`
	attrs := []string{"尺寸", "颜色"}
	got := parseWorkModeMissingAttributes(raw, attrs)
	want := []string{"尺寸"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
}

func TestSplitCategoryCommaAttrs(t *testing.T) {
	got := splitCategoryCommaAttrs("A，B, C ")
	want := []string{"A", "B", "C"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
}

func TestFormatWorkModeCandidateBriefs_TruncatesLongSummary(t *testing.T) {
	long := strings.Repeat("X", 300)
	c := []*domain.RankedNodeChunks{
		{NodeName: "美国信封", NodeSummary: "白色 A4 美国"},
		{NodeName: "日本信封", NodeSummary: long},
	}
	out := formatWorkModeCandidateBriefs(c)
	if !strings.Contains(out, "美国信封") || !strings.Contains(out, "日本信封") {
		t.Fatalf("missing names: %s", out)
	}
	if !strings.Contains(out, "…") {
		t.Fatalf("expected truncation marker, got %q", out)
	}
}

func TestPickCategoryFromClassifyOutput(t *testing.T) {
	cats := []domain.CategoryPromptItem{
		{Name: "手机", Content: "x"},
		{Name: "电脑", Content: "y"},
	}
	m := pickCategoryFromClassifyOutput("手机", cats)
	if m == nil || m.Name != "手机" {
		t.Fatalf("expected 手机, got %v", m)
	}
	if pickCategoryFromClassifyOutput("NONE", cats) != nil {
		t.Fatal("expected nil for NONE")
	}
}
