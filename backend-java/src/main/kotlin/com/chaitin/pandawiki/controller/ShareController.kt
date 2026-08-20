package com.chaitin.pandawiki.controller

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp
import java.time.OffsetDateTime
import java.util.LinkedHashMap

/**
 * App 前台（Next.js）所需的 /share/v1 系列公开接口。
 *
 * 说明：
 * - App 前台是从原版 Go 后端 swagger 生成的，接口格式对齐 domain.PWResponse：
 *   { "success": true, "code": 0, "message": "OK", "data": ... }
 * - 数据直接读 nodes / navs / knowledge_bases / apps 表（Java 后端暂不生成 node_releases 发布版本）。
 * - x-kb-id 为空时回退到第一个知识库，方便本地直接访问。
 */
@RestController
@RequestMapping("/share/v1")
class ShareController(
    private val jdbcTemplate: JdbcTemplate,
    private val objectMapper: ObjectMapper,
) {

    // ---------------- 响应包装 ----------------

    private fun ok(data: Any?): Map<String, Any?> = LinkedHashMap<String, Any?>().apply {
        put("success", true)
        put("message", "OK")
        put("code", 0)
        put("data", data)
    }

    private fun err(msg: String): Map<String, Any?> = LinkedHashMap<String, Any?>().apply {
        put("success", false)
        put("message", msg)
        put("code", 40000)
    }

    private fun parseJson(raw: Any?): Map<String, Any> {
        if (raw == null) return emptyMap()
        val text = raw.toString()
        if (text.isBlank() || text == "null") return emptyMap()
        return try {
            objectMapper.readValue(text, object : TypeReference<Map<String, Any>>() {})
        } catch (e: Exception) {
            emptyMap()
        }
    }

    /** 时间列统一转 ISO-8601 字符串，前端类型是 string */
    private fun iso(raw: Any?): String? = when (raw) {
        is Timestamp -> raw.toInstant().toString()
        is OffsetDateTime -> raw.toInstant().toString()
        else -> raw?.toString()
    }

    private fun resolveKbId(header: String?): String? {
        if (!header.isNullOrBlank()) return header
        return jdbcTemplate.queryForList(
            "SELECT id FROM knowledge_bases ORDER BY created_at LIMIT 1"
        ).firstOrNull()?.get("id") as? String
    }

    // ---------------- GET /share/v1/app/web/info ----------------

    @GetMapping("/app/web/info")
    fun webInfo(
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader) ?: return err("kb_id is required")
        val kb = jdbcTemplate.queryForList(
            "SELECT id, name, access_settings FROM knowledge_bases WHERE id = ?", kbId
        ).firstOrNull() ?: return err("knowledge base not found")

        val kbName = kb["name"] as? String ?: ""
        val accessSettings = parseJson(kb["access_settings"])
        val baseUrl = accessSettings["base_url"] as? String ?: "http://localhost:3010"

        val app = jdbcTemplate.queryForList(
            "SELECT name, settings FROM apps WHERE kb_id = ? AND type = 1 ORDER BY created_at LIMIT 1",
            kbId
        ).firstOrNull()
        val appName = app?.get("name") as? String ?: kbName

        val settings = LinkedHashMap<String, Any?>(parseJson(app?.get("settings")))
        settings.putIfAbsent("title", appName)
        settings.putIfAbsent("icon", "")
        settings.putIfAbsent("desc", "")
        settings.putIfAbsent("keyword", "")
        settings.putIfAbsent("home_page_setting", "doc")

        return ok(LinkedHashMap<String, Any?>().apply {
            put("name", appName)
            put("base_url", baseUrl)
            put("settings", settings)
        })
    }

    // ---------------- GET /share/v1/app/widget/info ----------------

    @GetMapping("/app/widget/info")
    fun widgetInfo(
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader) ?: return err("kb_id is required")
        val kb = jdbcTemplate.queryForList(
            "SELECT id, name, access_settings FROM knowledge_bases WHERE id = ?", kbId
        ).firstOrNull() ?: return err("knowledge base not found")

        val kbName = kb["name"] as? String ?: ""
        val accessSettings = parseJson(kb["access_settings"])
        val baseUrl = accessSettings["base_url"] as? String ?: "http://localhost:3010"

        val app = jdbcTemplate.queryForList(
            "SELECT name, settings FROM apps WHERE kb_id = ? AND type = 2 ORDER BY created_at LIMIT 1",
            kbId
        ).firstOrNull()
        val appName = app?.get("name") as? String ?: kbName
        val settings = LinkedHashMap<String, Any?>(parseJson(app?.get("settings")))
        val widgetSettings = settings["widget_bot_settings"] as? Map<String, Any?> ?: emptyMap<String, Any?>()

        return ok(LinkedHashMap<String, Any?>().apply {
            put("name", appName)
            put("base_url", baseUrl)
            put("settings", mapOf("widget_bot_settings" to widgetSettings))
        })
    }

    // ---------------- GET /share/v1/nav/list ----------------

    @GetMapping("/nav/list")
    fun navList(
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader) ?: return err("kb_id is required")
        val navs = jdbcTemplate.queryForList(
            "SELECT id, name, position FROM navs WHERE kb_id = ? ORDER BY position ASC", kbId
        )
        return ok(navs)
    }

    // ---------------- GET /share/v1/node/list ----------------

    @GetMapping("/node/list")
    fun nodeList(
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader) ?: return err("kb_id is required")

        val navs = jdbcTemplate.queryForList(
            "SELECT id, name, position FROM navs WHERE kb_id = ? ORDER BY position ASC", kbId
        )

        val nodes = jdbcTemplate.queryForList(
            """SELECT id, name, type, parent_id, nav_id, position, meta, status,
                      created_at, updated_at
               FROM nodes
               WHERE kb_id = ?""",
            kbId
        )

        // 按 nav_id 分组
        val groups = LinkedHashMap<String, MutableList<Map<String, Any?>>>()
        navs.forEach { nav ->
            val navId = nav["id"] as? String ?: ""
            groups[navId] = java.util.ArrayList()
        }
        groups[""] = java.util.ArrayList()

        nodes.forEach { node ->
            val item = nodeToListItem(node)
            val navId = item["nav_id"] as? String ?: ""
            (groups[navId] ?: groups.getValue(""))!!.add(item)
        }

        val result = java.util.ArrayList<Map<String, Any?>>()
        navs.forEach { nav ->
            val navId = nav["id"] as? String ?: ""
            val list = groups[navId] ?: emptyList()
            result.add(LinkedHashMap<String, Any?>().apply {
                put("nav_id", navId)
                put("nav_name", nav["name"] ?: "")
                put("position", nav["position"] ?: 0)
                put("list", list)
                put("count", list.size)
            })
        }
        val orphan = groups.getValue("")
        if (orphan.isNotEmpty()) {
            result.add(LinkedHashMap<String, Any?>().apply {
                put("nav_id", "")
                put("nav_name", "")
                put("position", 0)
                put("list", orphan)
                put("count", orphan.size)
            })
        }
        return ok(result)
    }

    // ---------------- GET /share/v1/node/detail ----------------

    @GetMapping("/node/detail")
    fun nodeDetail(
        @RequestParam("id") id: String,
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader) ?: return err("kb_id is required")
        val node = jdbcTemplate.queryForList(
            """SELECT id, kb_id, name, type, parent_id, nav_id, position, content,
                      meta, status, permissions, creator_id, editor_id,
                      created_at, updated_at
               FROM nodes
               WHERE id = ? AND kb_id = ?""",
            id, kbId
        ).firstOrNull() ?: return err("node not found")

        return ok(nodeToDetail(node))
    }

    // ---------------- 节点映射 ----------------

    private fun nodeToListItem(node: Map<String, Any?>): Map<String, Any?> {
        val meta = parseJson(node["meta"])
        val status = node["status"]
        return LinkedHashMap<String, Any?>().apply {
            put("id", node["id"])
            put("name", node["name"])
            put("type", node["type"])
            put("parent_id", node["parent_id"])
            put("nav_id", node["nav_id"])
            put("position", node["position"])
            put("emoji", meta["emoji"])
            put("summary", meta["summary"])
            put("meta", meta)
            put("status", status)
            put("created_at", iso(node["created_at"]))
            put("updated_at", iso(node["updated_at"]))
        }
    }

    private fun nodeToDetail(node: Map<String, Any?>): Map<String, Any?> {
        val meta = parseJson(node["meta"])
        val permissions = parseJson(node["permissions"])
        return LinkedHashMap<String, Any?>().apply {
            put("id", node["id"])
            put("kb_id", node["kb_id"])
            put("name", node["name"])
            put("type", node["type"])
            put("parent_id", node["parent_id"])
            put("nav_id", node["nav_id"])
            put("position", node["position"])
            put("content", node["content"])
            put("meta", meta)
            put("status", node["status"])
            put("permissions", permissions)
            put("creator_id", node["creator_id"])
            put("editor_id", node["editor_id"])
            put("created_at", iso(node["created_at"]))
            put("updated_at", iso(node["updated_at"]))
        }
    }
}
