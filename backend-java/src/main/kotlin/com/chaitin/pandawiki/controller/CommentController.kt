package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.security.JwtService
import com.fasterxml.jackson.databind.ObjectMapper
import io.jsonwebtoken.Claims
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

/**
 * 评论相关接口：
 * - POST /share/v1/comment            App 前台创建评论
 * - GET  /share/v1/comment/list       App 前台查询文档评论
 * - GET  /api/v1/comment              Admin 评论管理列表
 * - POST /api/pro/v1/comment_moderate Admin 批量审核评论
 * - DELETE /api/v1/comment/list       Admin 删除评论
 *
 * 对齐 Go 后端行为。
 */
@RestController
class CommentController(
    private val jdbcTemplate: JdbcTemplate,
    private val captchaController: CaptchaController,
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper
) {

    data class CommentReq(
        val node_id: String,
        val content: String,
        val user_name: String? = null,
        val parent_id: String? = null,
        val root_id: String? = null,
        val captcha_token: String? = null,
        val pic_urls: List<String> = emptyList()
    )

    data class CommentModerateReq(
        val ids: List<String>,
        val status: Int
    )

    data class CommentInfo(
        val auth_user_id: Long = 0,
        val user_name: String? = null,
        val email: String? = null,
        val avatar: String? = null,
        val remote_ip: String? = null
    )

    data class ShareCommentListItem(
        val id: String? = null,
        val kb_id: String? = null,
        val node_id: String? = null,
        val parent_id: String? = null,
        val root_id: String? = null,
        val content: String? = null,
        val pic_urls: List<String> = emptyList(),
        val info: CommentInfo = CommentInfo(),
        val created_at: String? = null
    )

    data class CommentListItem(
        val id: String? = null,
        val node_id: String? = null,
        val root_id: String? = null,
        val content: String? = null,
        val status: Int = 0,
        val node_name: String? = null,
        val node_type: Int? = null,
        val info: CommentInfo = CommentInfo(),
        val created_at: String? = null
    )

    @PostMapping("/share/v1/comment")
    fun createComment(
        @RequestBody req: CommentReq,
        @RequestHeader("x-kb-id") kbIdHeader: String?,
        request: HttpServletRequest
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader)
            ?: return error(HttpStatus.BAD_REQUEST.value(), "缺少知识库 ID")

        val settings = getWebAppSettings(kbId)
            ?: return error(HttpStatus.NOT_FOUND.value(), "app info is not found")

        val commentSettings = settings["web_app_comment_settings"] as? Map<*, *>
        val isEnable = (commentSettings?.get("is_enable") as? Boolean) == true
        if (!isEnable) {
            return error(HttpStatus.BAD_REQUEST.value(), "please check comment is open")
        }

        if (!captchaController.validateToken(req.captcha_token)) {
            return error(HttpStatus.BAD_REQUEST.value(), "failed to validate captcha token")
        }

        req.pic_urls.forEach { url ->
            if (!url.startsWith("/static-file/")) {
                return error(HttpStatus.BAD_REQUEST.value(), "validate param pic_urls failed")
            }
        }

        val node = jdbcTemplate.queryForList(
            "SELECT id FROM nodes WHERE id = ? AND kb_id = ?",
            req.node_id, kbId
        ).firstOrNull() ?: return error(HttpStatus.NOT_FOUND.value(), "node not found")

        val moderate = (commentSettings?.get("moderation_enable") as? Boolean) == true
        val status = if (moderate) 0 else 1

        val commentId = UUID.randomUUID().toString()
        val remoteIp = extractClientIp(request)
        val now = OffsetDateTime.now()
        val info = CommentInfo(
            user_name = req.user_name,
            remote_ip = remoteIp
        )

        jdbcTemplate.update(
            """INSERT INTO comments (id, kb_id, node_id, info, parent_id, root_id, content, status, pic_urls, created_at)
               VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?)""",
            commentId, kbId, req.node_id, objectMapper.writeValueAsString(info),
            req.parent_id ?: "", req.root_id ?: "", req.content, status,
            req.pic_urls.toTypedArray(), now
        )

        return success(commentId)
    }

    @GetMapping("/share/v1/comment/list")
    fun getCommentList(
        @RequestParam id: String,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader)
            ?: return error(HttpStatus.BAD_REQUEST.value(), "缺少知识库 ID")

        val settings = getWebAppSettings(kbId)
            ?: return error(HttpStatus.NOT_FOUND.value(), "app info is not found")
        val commentSettings = settings["web_app_comment_settings"] as? Map<*, *>
        val isEnable = (commentSettings?.get("is_enable") as? Boolean) == true
        if (!isEnable) {
            return error(HttpStatus.BAD_REQUEST.value(), "please check comment is open")
        }

        val rows = jdbcTemplate.queryForList(
            """SELECT id, kb_id, node_id, info, parent_id, root_id, content, pic_urls, created_at
               FROM comments WHERE node_id = ? AND status = 1 ORDER BY created_at DESC""",
            id
        )

        val list = rows.map { row ->
            ShareCommentListItem(
                id = row["id"].toString(),
                kb_id = row["kb_id"]?.toString(),
                node_id = row["node_id"]?.toString(),
                parent_id = row["parent_id"]?.toString(),
                root_id = row["root_id"]?.toString(),
                content = row["content"]?.toString(),
                pic_urls = (row["pic_urls"] as? Array<*>)?.map { it.toString() } ?: emptyList(),
                info = parseCommentInfo(row["info"]),
                created_at = row["created_at"]?.toString()
            )
        }

        return success(mapOf("data" to list, "total" to list.size))
    }

    @GetMapping("/api/v1/comment")
    fun getCommentModeratedList(
        @RequestParam kb_id: String,
        @RequestParam page: Int,
        @RequestParam per_page: Int,
        @RequestParam(required = false) status: Int?,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireAdmin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            response.status = HttpStatus.FORBIDDEN.value()
            return error(HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val offset = (page - 1) * per_page
        val where = StringBuilder("WHERE comments.kb_id = ?")
        val params = mutableListOf<Any>(kb_id)
        if (status != null) {
            where.append(" AND comments.status = ?")
            params.add(status)
        }

        val count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM comments $where", Long::class.java, *params.toTypedArray()
        ) ?: 0L

        val rows = jdbcTemplate.queryForList(
            """SELECT comments.*, nodes.name AS node_name, nodes.type AS node_type
               FROM comments
               LEFT JOIN nodes ON nodes.id = comments.node_id
               $where
               ORDER BY comments.created_at DESC
               LIMIT ? OFFSET ?""",
            *(params + listOf(per_page, offset)).toTypedArray()
        )

        val list = rows.map { row ->
            CommentListItem(
                id = row["id"].toString(),
                node_id = row["node_id"]?.toString(),
                root_id = row["root_id"]?.toString(),
                content = row["content"]?.toString(),
                status = (row["status"] as? Number)?.toInt() ?: 0,
                node_name = row["node_name"]?.toString(),
                node_type = (row["node_type"] as? Number)?.toInt(),
                info = parseCommentInfo(row["info"]),
                created_at = row["created_at"]?.toString()
            )
        }

        return success(mapOf("data" to list, "total" to count))
    }

    @PostMapping("/api/pro/v1/comment_moderate")
    fun moderateComments(
        @RequestBody req: CommentModerateReq,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        requireAdmin(response, authHeader) ?: return emptyMap()

        if (req.ids.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST.value(), "len comment id is zero")
        }
        if (req.status !in listOf(-1, 0, 1)) {
            return error(HttpStatus.BAD_REQUEST.value(), "invalid status")
        }

        jdbcTemplate.update(
            "UPDATE comments SET status = ? WHERE id IN (${req.ids.joinToString(",") { "?" }})",
            *(listOf(req.status) + req.ids).toTypedArray()
        )
        return success(null)
    }

    @DeleteMapping("/api/v1/comment/list")
    fun deleteCommentList(
        @RequestParam ids: List<String>,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        requireAdmin(response, authHeader) ?: return emptyMap()

        if (ids.isEmpty()) {
            return error(HttpStatus.BAD_REQUEST.value(), "len comment id is zero")
        }
        jdbcTemplate.update(
            "DELETE FROM comments WHERE id IN (${ids.joinToString(",") { "?" }})",
            *ids.toTypedArray()
        )
        return success(null)
    }

    private fun getWebAppSettings(kbId: String): Map<String, Any?>? {
        val settingsJson = jdbcTemplate.queryForList(
            "SELECT settings FROM apps WHERE kb_id = ? AND type = ?",
            kbId, 1.toShort()
        ).firstOrNull()?.get("settings")?.toString() ?: return null
        return try {
            @Suppress("UNCHECKED_CAST")
            objectMapper.readValue(settingsJson, Map::class.java) as Map<String, Any?>
        } catch (e: Exception) {
            null
        }
    }

    private fun parseCommentInfo(value: Any?): CommentInfo {
        if (value == null) return CommentInfo()
        return try {
            val json = when (value) {
                is String -> value
                is ByteArray -> String(value)
                else -> value.toString()
            }
            objectMapper.readValue(json, CommentInfo::class.java)
        } catch (e: Exception) {
            CommentInfo()
        }
    }

    private fun resolveKbId(header: String?): String? {
        if (!header.isNullOrBlank()) return header
        return jdbcTemplate.queryForList(
            "SELECT id FROM knowledge_bases ORDER BY created_at LIMIT 1"
        ).firstOrNull()?.get("id") as? String
    }

    private fun extractClientIp(request: HttpServletRequest): String {
        val headers = listOf("X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP")
        for (h in headers) {
            val value = request.getHeader(h)
            if (!value.isNullOrBlank() && !value.equals("unknown", ignoreCase = true)) {
                return value.split(",")[0].trim()
            }
        }
        return request.remoteAddr ?: "unknown"
    }

    private fun checkKbPermission(claims: Claims, kbId: String): Boolean {
        return "admin" == jwtService.role(claims)
    }

    private fun requireAdmin(response: HttpServletResponse, authHeader: String?): Claims? {
        return try {
            val claims = jwtService.parseBearer(authHeader)
            if ("admin" != jwtService.role(claims)) {
                response.status = HttpStatus.FORBIDDEN.value()
                return null
            }
            claims
        } catch (e: Exception) {
            response.status = HttpStatus.UNAUTHORIZED.value()
            null
        }
    }

    private fun success(data: Any?): Map<String, Any?> {
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to data)
    }

    private fun error(code: Int, message: String): Map<String, Any?> {
        return mapOf("success" to false, "code" to code, "message" to message, "data" to null)
    }
}
