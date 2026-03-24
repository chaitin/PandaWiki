package ipdb

import (
	"embed"
	"fmt"
	"strings"

	"github.com/lionsoul2014/ip2region/binding/golang/xdb"

	"github.com/chaitin/panda-wiki/config"
	"github.com/chaitin/panda-wiki/domain"
	"github.com/chaitin/panda-wiki/log"
)

//go:embed ip2region.xdb
var ipdbFiles embed.FS

type IPDB struct {
	searcher *xdb.Searcher
	logger   *log.Logger
}

func NewIPDB(config *config.Config, logger *log.Logger) (*IPDB, error) {
	cBuff, err := xdb.LoadContentFromFS(ipdbFiles, "ip2region.xdb")
	if err != nil {
		return nil, fmt.Errorf("load xdb index failed: %w", err)
	}
	searcher, err := xdb.NewWithBuffer(cBuff)
	if err != nil {
		return nil, fmt.Errorf("new xdb reader failed: %w", err)
	}
	return &IPDB{searcher: searcher, logger: logger.WithModule("store.ipdb")}, nil
}

func (a *IPDB) Lookup(ip string) (addr *domain.IPAddress, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			a.logger.Error("ipdb lookup panic", log.Any("panic", rec), log.String("ip", ip))
			err = fmt.Errorf("ipdb lookup panic: %v", rec)
		}
	}()

	region, err := a.searcher.SearchByStr(ip)
	if err != nil {
		return nil, fmt.Errorf("search ip failed: %w", err)
	}
	ipInfo := strings.Split(region, "|")
	if len(ipInfo) != 5 {
		return nil, fmt.Errorf("invalid ip info: %s", region)
	}
	country := ipInfo[0]
	province := ipInfo[2]
	city := ipInfo[3]
	if country == "0" {
		country = "未知"
	}
	if province == "0" {
		province = "未知"
	}
	if city == "0" {
		city = "未知"
	}
	return &domain.IPAddress{
		IP:       ip,
		Country:  country,
		Province: province,
		City:     city,
	}, nil
}
