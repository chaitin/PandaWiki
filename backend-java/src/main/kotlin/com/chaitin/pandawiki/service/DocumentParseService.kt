package com.chaitin.pandawiki.service

import com.chaitin.pandawiki.dto.*
import com.fasterxml.jackson.databind.ObjectMapper
import com.vladsch.flexmark.html2md.converter.FlexmarkHtmlConverter
import org.apache.tika.metadata.Metadata
import org.apache.tika.parser.AutoDetectParser
import org.apache.tika.sax.BodyContentHandler
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

/**
 * 文档解析服务：把本地文件、URL、飞书文档转换成 Markdown/纯文本。
 */
@Service
class DocumentParseService(
    private val objectMapper: ObjectMapper
) {

    @Value("\${panda.upload.dir:data/static}")
    private lateinit var uploadDir: String

    private val maxRemoteSize = 50L * 1024 * 1024

    // ---------- 本地文件解析 ----------

    /**
     * 解析本地文件，返回 Markdown 或纯文本。
     */
    fun parseLocalFile(key: String): String {
        val path = resolveUploadPath(key)
        if (!Files.exists(path)) {
            throw IllegalArgumentException("文件不存在: $key")
        }
        val ext = path.toString().substringAfterLast('.', "").lowercase()
        return when (ext) {
            "txt", "md", "markdown", "html", "htm" -> Files.readString(path, StandardCharsets.UTF_8)
            else -> extractByTika(path)
        }
    }

    private fun extractByTika(path: Path): String {
        val parser = AutoDetectParser()
        val handler = BodyContentHandler(-1)
        val metadata = Metadata()
        Files.newInputStream(path).use { stream ->
            parser.parse(stream, handler, metadata)
        }
        return handler.toString().trim()
    }

    // ---------- URL 抓取解析 ----------

    /**
     * 抓取 URL 页面，返回 Pair(标题, Markdown正文)。
     */
    fun parseUrl(urlStr: String): Pair<String, String> {
        if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
            throw IllegalArgumentException("仅支持 http/https 地址")
        }
        val data = download(urlStr)
        val doc = Jsoup.parse(String(data, StandardCharsets.UTF_8), urlStr)
        val title = doc.title().ifBlank { urlStr }
        val html = extractMainHtml(doc)
        val markdown = FlexmarkHtmlConverter.builder().build().convert(html)
        return title to markdown
    }

    private fun extractMainHtml(doc: Document): String {
        // 优先取正文区域，降级取 body
        var main: Element? = doc.selectFirst("article")
        if (main == null) main = doc.selectFirst("main")
        if (main == null) main = doc.selectFirst("[role='main']")
        if (main == null) {
            // 常见内容容器兜底
            for (selector in listOf(".content", "#content", ".post-content", "#post-content", ".entry-content")) {
                main = doc.selectFirst(selector)
                if (main != null) break
            }
        }
        if (main == null) {
            main = doc.body()
        }
        // 移除脚本、样式、导航、页脚、广告等噪声
        main.select("script, style, nav, footer, header, aside, .ads, .advertisement").remove()
        return main.html()
    }

    private fun download(urlStr: String): ByteArray {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.instanceFollowRedirects = false
        conn.connectTimeout = 10_000
        conn.readTimeout = 30_000
        conn.setRequestProperty("User-Agent", "PandaWiki/2.0")
        conn.requestMethod = "GET"
        return try {
            val code = conn.responseCode
            if (code in 300..<400) {
                throw IOException("出于安全原因不允许重定向")
            }
            if (code != HttpURLConnection.HTTP_OK) {
                throw IOException("下载失败, HTTP $code")
            }
            conn.inputStream.use { it.readNBytes(maxRemoteSize.toInt()) }.also {
                if (it.size >= maxRemoteSize) throw IOException("文件大小超过 50MB 限制")
            }
        } finally {
            conn.disconnect()
        }
    }

    // ---------- 飞书文档 ----------

    /**
     * 拉取飞书云文档列表，构建文档树。
     */
    fun listFeishuDocs(setting: FeishuSetting): DocsTree {
        val appToken = getFeishuAppToken(setting)
        val docs = when {
            !setting.spaceId.isNullOrBlank() -> {
                val spaceId = resolveSpaceId(setting.spaceId, appToken, setting.userAccessToken)
                listFeishuWikiNodes(spaceId, appToken, setting.userAccessToken)
            }
            else -> searchFeishuDocs(appToken, setting.userAccessToken)
        }
        if (docs.isEmpty()) {
            return DocsTree(
                DocValue("root", "飞书文档", "", "", false),
                emptyList()
            )
        }
        val children = docs.map {
            DocsTree(
                DocValue(
                    it["obj_token"] as String,
                    it["title"] as? String ?: "未命名",
                    "",
                    it["obj_type"] as? String ?: "doc",
                    true
                ),
                emptyList()
            )
        }
        return DocsTree(
            DocValue("root", "飞书文档", "", "", false),
            children
        )
    }

    /**
     * 导出飞书文档为 Markdown/纯文本。
     */
    fun exportFeishuDoc(setting: FeishuSetting, docId: String, fileType: String?): String {
        val appToken = getFeishuAppToken(setting)
        // 飞书文档没有直接转 Markdown 的开放接口，先获取纯文本内容。
        // 知识空间（wiki）与云文档（doc/docx）接口不同，按 fileType 简单区分。
        return when (fileType) {
            "wiki" -> getFeishuWikiContent(docId, setting, appToken)
            "docx" -> getFeishuDocxContent(docId, appToken, setting.userAccessToken)
            else -> getFeishuDocContent(docId, appToken, setting.userAccessToken)
        }
    }

    private fun getFeishuAppToken(setting: FeishuSetting): String {
        val body = mapOf(
            "app_id" to setting.appId,
            "app_secret" to setting.appSecret
        )
        val resp = postJson(
            "https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal",
            body,
            null
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书 app_token 获取失败: ${tree.path("msg").asText()}")
        }
        return tree.path("app_access_token").asText()
    }

    private fun searchFeishuDocs(appToken: String, userAccessToken: String?): List<Map<String, Any>> {
        // 不填 folder_token 默认获取「我的云文档」根目录文件列表
        val resp = getJson(
            "https://open.feishu.cn/open-apis/drive/v1/files?page_size=50&order_by=EditedTime&direction=DESC",
            mapOf("Authorization" to "Bearer ${userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书文档列表获取失败: ${tree.path("msg").asText()}")
        }
        val items = mutableListOf<Map<String, Any>>()
        tree.path("data").path("files").forEach {
            val fileType = it.path("type").asText("")
            val objType = when (fileType) {
                "docx" -> "docx"
                "doc" -> "doc"
                "wiki" -> "wiki"
                else -> fileType
            }
            items.add(
                mapOf(
                    "obj_token" to it.path("token").asText(),
                    "title" to it.path("name").asText(""),
                    "obj_type" to objType
                )
            )
        }
        return items
    }

    /**
     * 把用户在网页版复制的 wiki_token（如 K7cnwkfqiis6uKk4qxDciJRBnZd）转成 API 需要的数字 space_id。
     */
    private fun resolveSpaceId(spaceIdOrToken: String, appToken: String, userAccessToken: String?): String {
        // 纯数字就是 space_id，直接返回
        if (spaceIdOrToken.all { it.isDigit() }) return spaceIdOrToken
        val resp = getJson(
            "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=$spaceIdOrToken",
            mapOf("Authorization" to "Bearer ${userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书知识空间 ID 解析失败: ${tree.path("msg").asText()}")
        }
        return tree.path("data").path("node").path("space_id").asText()
    }

    private fun listFeishuWikiNodes(spaceId: String, appToken: String, userAccessToken: String?): List<Map<String, Any>> {
        val resp = getJson(
            "https://open.feishu.cn/open-apis/wiki/v2/spaces/$spaceId/nodes?page_size=50",
            mapOf("Authorization" to "Bearer ${userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书知识空间节点获取失败: ${tree.path("msg").asText()}")
        }
        val items = mutableListOf<Map<String, Any>>()
        tree.path("data").path("items").forEach {
            items.add(
                mapOf(
                    "obj_token" to it.path("node_token").asText(),
                    "title" to it.path("title").asText(""),
                    "obj_type" to "wiki"
                )
            )
        }
        return items
    }

    private fun getFeishuDocxContent(docId: String, appToken: String, userAccessToken: String?): String {
        // 新版 docx 文档 API：获取文档纯文本内容
        val resp = getJson(
            "https://open.feishu.cn/open-apis/docx/v1/documents/$docId/raw_content",
            mapOf("Authorization" to "Bearer ${userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书文档内容获取失败: ${tree.path("msg").asText()}")
        }
        return tree.path("data").path("content").asText("")
    }

    private fun getFeishuDocContent(docId: String, appToken: String, userAccessToken: String?): String {
        // 旧版 doc 文档 API
        val resp = getJson(
            "https://open.feishu.cn/open-apis/document/v1/documents/$docId/content",
            mapOf("Authorization" to "Bearer ${userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            // 新版文档也可能走旧 token 路径，兜底再试 docx
            return getFeishuDocxContent(docId, appToken, userAccessToken)
        }
        return tree.path("data").path("content").asText("")
    }

    private fun getFeishuWikiContent(nodeToken: String, setting: FeishuSetting, appToken: String): String {
        // 先拿 node 对应的 obj_token，再按文档类型取内容
        val resp = getJson(
            "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=$nodeToken",
            mapOf("Authorization" to "Bearer ${setting.userAccessToken ?: appToken}")
        )
        val tree = objectMapper.readTree(resp)
        if (tree.path("code").asInt() != 0) {
            throw RuntimeException("飞书知识空间节点详情失败: ${tree.path("msg").asText()}")
        }
        val node = tree.path("data").path("node")
        val objToken = node.path("obj_token").asText()
        // 新版 wiki 节点 obj_type 可能是 docx，兼容处理
        val objType = when (node.path("obj_type").asText("doc")) {
            "docx" -> "docx"
            else -> "doc"
        }
        return exportFeishuDoc(setting, objToken, objType)
    }

    // ---------- HTTP 工具 ----------

    private fun postJson(url: String, body: Map<String, Any?>, headers: Map<String, String>?): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 10_000
        conn.readTimeout = 30_000
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        headers?.forEach { (k, v) -> conn.setRequestProperty(k, v) }
        return try {
            conn.outputStream.use { it.write(objectMapper.writeValueAsBytes(body)) }
            readResponse(conn)
        } finally {
            conn.disconnect()
        }
    }

    private fun getJson(url: String, headers: Map<String, String>): String {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "GET"
        conn.connectTimeout = 10_000
        conn.readTimeout = 30_000
        headers.forEach { (k, v) -> conn.setRequestProperty(k, v) }
        return try {
            readResponse(conn)
        } finally {
            conn.disconnect()
        }
    }

    private fun readResponse(conn: HttpURLConnection): String {
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.bufferedReader(StandardCharsets.UTF_8)?.use { it.readText() } ?: ""
        if (code !in 200..299) {
            throw IOException("HTTP $code: ${text.take(500)}")
        }
        return text
    }

    private fun resolveUploadPath(key: String): Path {
        val base = Paths.get(uploadDir).toAbsolutePath().normalize()
        val target = base.resolve(key).normalize()
        if (!target.startsWith(base)) {
            throw IllegalArgumentException("非法文件路径")
        }
        return target
    }
}
