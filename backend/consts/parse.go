package consts

type CrawlerSource string

const (
	// CrawlerSourceUrl key或url形式 直接走parse接口
	CrawlerSourceUrl     CrawlerSource = "url"
	CrawlerSourceRSS     CrawlerSource = "rss"
	CrawlerSourceSitemap CrawlerSource = "sitemap"
	CrawlerSourceNotion  CrawlerSource = "notion"
	CrawlerSourceFeishu  CrawlerSource = "feishu"

	// CrawlerSourceFile file形式 需要先走upload接口先上传文件
	CrawlerSourceFile       CrawlerSource = "file"
	CrawlerSourceEpub       CrawlerSource = "epub"
	CrawlerSourceYuque      CrawlerSource = "yuque"
	CrawlerSourceSiyuan     CrawlerSource = "siyuan"
	CrawlerSourceMindoc     CrawlerSource = "mindoc"
	CrawlerSourceWikijs     CrawlerSource = "wikijs"
	CrawlerSourceConfluence CrawlerSource = "confluence"
)

type CrawlerSourceType string

const (
	CrawlerSourceTypeFile CrawlerSourceType = "file"
	CrawlerSourceTypeUrl  CrawlerSourceType = "url"
	CrawlerSourceTypeKey  CrawlerSourceType = "key"
)

func (c CrawlerSource) Type() CrawlerSourceType {
	switch c {
	case CrawlerSourceNotion, CrawlerSourceFeishu:
		return CrawlerSourceTypeKey
	case CrawlerSourceUrl, CrawlerSourceRSS, CrawlerSourceSitemap:
		return CrawlerSourceTypeUrl
	case CrawlerSourceFile, CrawlerSourceEpub, CrawlerSourceYuque, CrawlerSourceSiyuan, CrawlerSourceMindoc, CrawlerSourceWikijs, CrawlerSourceConfluence:
		return CrawlerSourceTypeFile
	default:
		return ""
	}
}
