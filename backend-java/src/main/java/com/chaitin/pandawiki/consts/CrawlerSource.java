package com.chaitin.pandawiki.consts;

/**
 * 文档导入来源，与前端 ConstsCrawlerSource 对齐。
 */
public enum CrawlerSource {
    URL("url"),
    RSS("rss"),
    SITEMAP("sitemap"),
    NOTION("notion"),
    FEISHU("feishu"),
    DINGTALK("dingtalk"),
    FILE("file"),
    EPUB("epub"),
    YUQUE("yuque"),
    SIYUAN("siyuan"),
    MINDOC("mindoc"),
    WIKIJS("wikijs"),
    CONFLUENCE("confluence");

    private final String value;

    CrawlerSource(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CrawlerSource from(String value) {
        for (CrawlerSource source : values()) {
            if (source.value.equalsIgnoreCase(value)) {
                return source;
            }
        }
        throw new IllegalArgumentException("unknown crawler source: " + value);
    }

    /**
     * 来源分类：file 需先上传文件，url 直接解析地址，key 需第三方平台凭证。
     */
    public CrawlerSourceType getType() {
        return switch (this) {
            case FILE, EPUB, YUQUE, SIYUAN, MINDOC, WIKIJS, CONFLUENCE -> CrawlerSourceType.FILE;
            case URL, RSS, SITEMAP -> CrawlerSourceType.URL;
            case NOTION, FEISHU, DINGTALK -> CrawlerSourceType.KEY;
        };
    }

    public enum CrawlerSourceType {
        FILE,
        URL,
        KEY
    }
}
