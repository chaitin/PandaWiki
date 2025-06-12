package utils

import (
	"testing"
	"time"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/log"
)

func TestList(t *testing.T) {
	cfg, _ := config.NewConfig()
	c := NewNotionClient("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", log.NewLogger(cfg))
	L, err := c.GetList(t.Context(), "")
	if err != nil {
		t.Error(err)
	}
	for _, v := range L {
		t.Log(v.Id, v.Title)
	}

	err = c.getBlock("20ee4af8-e2da-8009-93c2-e82ab7ddf346", "", c.root.root)
	if err != nil {
		t.Error(err)
	}
	time.Sleep(3 * time.Second)
	c.wg.Wait()
	t.Log(string(c.GetTreeRes()))
}
