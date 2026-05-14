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

func TestFilterRankedNodesByWorkModeDirectoryRoots(t *testing.T) {
	ranked := []*domain.RankedNodeChunks{
		{NodeID: "d1", NodePathIDs: []string{"root", "f1", "d1"}},
		{NodeID: "d2", NodePathIDs: []string{"root", "d2"}},
	}
	out := filterRankedNodesByWorkModeDirectoryRoots(ranked, []string{"f1"})
	if len(out) != 1 || out[0].NodeID != "d1" {
		t.Fatalf("expected one doc under f1, got %#v", out)
	}
	if len(filterRankedNodesByWorkModeDirectoryRoots(ranked, nil)) != 2 {
		t.Fatal("nil roots should not filter")
	}
}

func TestFilterRankedNodesByPinnedNodeIDs(t *testing.T) {
	ranked := []*domain.RankedNodeChunks{
		{NodeID: "d1"}, {NodeID: "d2"}, {NodeID: "d3"},
	}
	out := filterRankedNodesByPinnedNodeIDs(ranked, []string{"d2"})
	if len(out) != 1 || out[0].NodeID != "d2" {
		t.Fatalf("expected only d2, got %#v", out)
	}
	if len(filterRankedNodesByPinnedNodeIDs(ranked, nil)) != 3 {
		t.Fatal("nil pinned should not filter")
	}
}

func TestParseWorkModeCollectedAttributes(t *testing.T) {
	attrs := []string{"尺寸", "材质", "颜色"}
	got := parseWorkModeCollectedAttributes(`{"collected":{"尺寸":"500ml","材质":"马口铁","虚构":"x"}}`, attrs)
	want := map[string]string{"尺寸": "500ml", "材质": "马口铁"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
	// 空值过滤
	got = parseWorkModeCollectedAttributes(`{"collected":{"尺寸":""}}`, attrs)
	if got != nil {
		t.Fatalf("expected nil for empty values, got %#v", got)
	}
	// 简化形式
	got = parseWorkModeCollectedAttributes(`{"尺寸":"100"}`, attrs)
	want = map[string]string{"尺寸": "100"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("flat got %#v want %#v", got, want)
	}
}

func TestMergeCollectedAttributes(t *testing.T) {
	attrs := []string{"a", "b", "c"}
	prev := map[string]string{"a": "1", "x": "ignored"}
	fresh := map[string]string{"b": "2", "a": "1.1"}
	got := MergeCollectedAttributes(prev, fresh, attrs)
	want := map[string]string{"a": "1.1", "b": "2"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("got %#v want %#v", got, want)
	}
}

func TestAttrValueMatches(t *testing.T) {
	if !attrValueMatches("500ml", "500") {
		t.Fatal("contains should match")
	}
	if !attrValueMatches("500ml", "") {
		t.Fatal("empty user value should match")
	}
	if attrValueMatches("马口铁", "塑料") {
		t.Fatal("disjoint values should not match")
	}
}

func TestExtractLatestWorkModeClarifyMeta(t *testing.T) {
	msgs := []*domain.ConversationMessage{
		{Role: "user", Content: "你好"},
		{Role: "assistant", Content: "<!-- WORK_MODE_CLARIFY {\"category\":\"罐头\",\"collected\":{\"尺寸\":\"500ml\"},\"round\":1,\"max_rounds\":3} -->\n请补充材质"},
		{Role: "user", Content: "材质是马口铁"},
	}
	meta := extractLatestWorkModeClarifyMeta(msgs)
	if meta == nil || meta.Category != "罐头" || meta.Collected["尺寸"] != "500ml" || meta.Round != 1 {
		t.Fatalf("parse failed: %#v", meta)
	}
	if extractLatestWorkModeClarifyMeta(nil) != nil {
		t.Fatal("expected nil for nil msgs")
	}
}

func TestFilterAlreadyCollected(t *testing.T) {
	out := filterAlreadyCollected([]string{"尺寸", "材质"}, map[string]string{"材质": "马口铁"})
	if len(out) != 1 || out[0] != "尺寸" {
		t.Fatalf("got %#v", out)
	}
}

func TestMergeRankedNodesByID(t *testing.T) {
	a := []*domain.RankedNodeChunks{
		{NodeID: "d1", NodeName: "美国信封"},
		{NodeID: "d2", NodeName: "日本信封"},
	}
	b := []*domain.RankedNodeChunks{
		{NodeID: "d2", NodeName: "日本信封 (dup)"},
		{NodeID: "d3", NodeName: "韩国信封"},
		{NodeID: "", NodeName: "ignored"},
		nil,
	}
	out := MergeRankedNodesByID(a, b)
	if len(out) != 3 {
		t.Fatalf("expected 3 unique, got %d", len(out))
	}
	if out[0].NodeID != "d1" || out[1].NodeID != "d2" || out[2].NodeID != "d3" {
		t.Fatalf("order mismatch: %#v", out)
	}
}
