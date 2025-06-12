package utils

import (
	"testing"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/log"
)

func TestList(t *testing.T) {
	cfg, _ := config.NewConfig()
	c := NewNotionClient("integration", log.NewLogger(cfg))
	L, err := c.GetList(t.Context(), "")
	if err != nil {
		t.Error(err)
	}
	for _, v := range L {
		t.Log(v.Id, v.Title)
	}

	err = c.getBlock("blockid", "", c.root.root)
	if err != nil {
		t.Error(err)
	}
	c.wg.Wait()
	t.Log(string(c.GetTreeRes()))
}
