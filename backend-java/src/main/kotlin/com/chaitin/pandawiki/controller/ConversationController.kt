package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.security.JwtService
import com.chaitin.pandawiki.service.StatService
import com.fasterxml.jackson.databind.ObjectMapper
import io.jsonwebtoken.Claims
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.sql.Timestamp
import java.time.Instant
import java.time.format.DateTimeFormatter

/**
 * 对话相关接口：
 * - GET /share/v1/conversation/detail    App 前台共享详情
 * - GET /api/v1/conversation             Admin 问答列表
 * - GET /api/v1/conversation/detail      Admin 问答详情
 */
@RestController
class ConversationController(
    private val jdbcTemplate: JdbcTemplate,
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper,
    private val statService: StatService
) {

    // ---------- DTOs ----------

    data class UserInfo(
        val auth_user_id: Long = 0,
        val name: String? = null,
        val real_name: String? = null,
        val email: String? = null,
        val avatar: String? = null,
        val from: Int = 2
    )

    data class ConversationInfo(
        val user_info: UserInfo = UserInfo()
    )

    data class FeedbackInfo(
        val score: Int = 0,
        val feedback_type: String? = null,
        val feedback_content: String? = null
    )

    // ---------- 前台共享接口 ----------

    @GetMapping("/share/v1/conversation/detail")
    fun shareDetail(@RequestParam("id") conversationId: String): Map<String, Any?> {
        val conversation = jdbcTemplate.queryForList(
            "SELECT id, subject, created_at FROM conversations WHERE id = ?",
            conversationId
        ).firstOrNull()

        val messages = jdbcTemplate.queryForList(
            """SELECT role, content, created_at FROM conversation_messages
               WHERE conversation_id = ? ORDER BY created_at ASC""",
            conversationId
        ).map { row ->
            mapOf(
                "role" to (row["role"]?.toString() ?: ""),
                "content" to (row["content"]?.toString() ?: ""),
                "created_at" to formatTime(row["created_at"])
            )
        }

        val data = mapOf(
            "id" to conversationId,
            "subject" to (conversation?.get("subject")?.toString() ?: ""),
            "created_at" to formatTime(conversation?.get("created_at")),
            "messages" to messages
        )

        return success(data)
    }

    // ---------- Admin 接口 ----------

    @GetMapping("/api/v1/conversation")
    fun list(
        @RequestParam kb_id: String,
        @RequestParam page: Int,
        @RequestParam per_page: Int,
        @RequestParam(required = false) subject: String?,
        @RequestParam(required = false) remote_ip: String?,
        @RequestParam(required = false) app_id: String?,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireAdmin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            response.status = HttpStatus.FORBIDDEN.value()
            return error(HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val offset = (page - 1) * per_page

        // 总数
        val count = jdbcTemplate.queryForObject(
            """SELECT COUNT(*) FROM conversations c
               WHERE c.kb_id = ?
                 AND (COALESCE(?, '') = '' OR c.subject ILIKE ?)
                 AND (COALESCE(?, '') = '' OR c.remote_ip ILIKE ?)
                 AND (COALESCE(?, '') = '' OR c.app_id = ?)""",
            Long::class.java,
            kb_id,
            subject, subject?.let { "%$it%" } ?: "",
            remote_ip, remote_ip?.let { "%$it%" } ?: "",
            app_id, app_id
        ) ?: 0L

        // 列表数据
        val rows = jdbcTemplate.queryForList(
            """SELECT c.id, c.subject, c.remote_ip, c.created_at, c.info, c.app_id,
                      a.name AS app_name, a.type AS app_type
               FROM conversations c
               LEFT JOIN apps a ON c.app_id = a.id
               WHERE c.kb_id = ?
                 AND (COALESCE(?, '') = '' OR c.subject ILIKE ?)
                 AND (COALESCE(?, '') = '' OR c.remote_ip ILIKE ?)
                 AND (COALESCE(?, '') = '' OR c.app_id = ?)
               ORDER BY c.created_at DESC
               LIMIT ? OFFSET ?""",
            kb_id,
            subject, subject?.let { "%$it%" } ?: "",
            remote_ip, remote_ip?.let { "%$it%" } ?: "",
            app_id, app_id,
            per_page, offset
        )

        val conversationIds = rows.map { it["id"].toString() }
        val feedbackMap = loadLatestFeedback(conversationIds)

        val list = rows.map { row ->
            val convId = row["id"].toString()
            val ip = row["remote_ip"]?.toString() ?: ""
            val info = parseConversationInfo(row["info"])
            val feedback = feedbackMap[convId] ?: FeedbackInfo()

            mapOf(
                "id" to convId,
                "subject" to (row["subject"]?.toString() ?: ""),
                "app_name" to (row["app_name"]?.toString() ?: ""),
                "app_type" to ((row["app_type"] as? Number)?.toInt() ?: 1),
                "info" to mapOf("user_info" to info.user_info),
                "remote_ip" to ip,
                "ip_address" to statService.lookupIp(ip),
                "created_at" to formatTime(row["created_at"]),
                "feedback_info" to feedback
            )
        }

        return success(mapOf("data" to list, "total" to count))
    }

    @GetMapping("/api/v1/conversation/detail")
    fun adminDetail(
        @RequestParam id: String,
        @RequestParam kb_id: String,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireAdmin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            response.status = HttpStatus.FORBIDDEN.value()
            return error(HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val conversation = jdbcTemplate.queryForList(
            "SELECT id, app_id, subject, remote_ip, created_at FROM conversations WHERE id = ? AND kb_id = ?",
            id, kb_id
        ).firstOrNull() ?: return error(HttpStatus.NOT_FOUND.value(), "会话不存在")

        val messages = jdbcTemplate.queryForList(
            """SELECT id, role, content, created_at, info, image_paths, provider, model,
                      prompt_tokens, completion_tokens, total_tokens
               FROM conversation_messages
               WHERE conversation_id = ? ORDER BY created_at ASC""",
            id
        ).map { row ->
            val imagePaths = row["image_paths"]
            val parsedPaths = when (imagePaths) {
                is java.sql.Array -> (imagePaths.array as? Array<*>)?.map { it.toString() } ?: emptyList()
                is Array<*> -> imagePaths.map { it.toString() }
                else -> emptyList()
            }
            mapOf(
                "id" to row["id"].toString(),
                "role" to (row["role"]?.toString() ?: ""),
                "content" to (row["content"]?.toString() ?: ""),
                "created_at" to formatTime(row["created_at"]),
                "image_paths" to parsedPaths,
                "info" to parseFeedbackInfo(row["info"]),
                "provider" to (row["provider"]?.toString() ?: ""),
                "model" to (row["model"]?.toString() ?: ""),
                "prompt_tokens" to ((row["prompt_tokens"] as? Number)?.toInt() ?: 0),
                "completion_tokens" to ((row["completion_tokens"] as? Number)?.toInt() ?: 0),
                "total_tokens" to ((row["total_tokens"] as? Number)?.toInt() ?: 0)
            )
        }

        val references = jdbcTemplate.queryForList(
            """SELECT node_id, name, url, favicon
               FROM conversation_references
               WHERE conversation_id = ?""",
            id
        ).map { row ->
            val name = row["name"]?.toString() ?: ""
            mapOf(
                "node_id" to (row["node_id"]?.toString() ?: ""),
                "name" to name,
                "title" to name,
                "url" to (row["url"]?.toString() ?: ""),
                "favicon" to (row["favicon"]?.toString() ?: "")
            )
        }

        val remoteIp = conversation["remote_ip"]?.toString() ?: ""
        val data = mapOf(
            "id" to id,
            "app_id" to (conversation["app_id"]?.toString() ?: ""),
            "subject" to (conversation["subject"]?.toString() ?: ""),
            "remote_ip" to remoteIp,
            "ip_address" to statService.lookupIp(remoteIp),
            "created_at" to formatTime(conversation["created_at"]),
            "messages" to messages,
            "references" to references
        )

        return success(data)
    }

    // ---------- 私有方法 ----------

    private fun loadLatestFeedback(conversationIds: List<String>): Map<String, FeedbackInfo> {
        if (conversationIds.isEmpty()) return emptyMap()
        val placeholders = conversationIds.joinToString(",") { "?" }
        val rows = jdbcTemplate.queryForList(
            """SELECT DISTINCT ON (conversation_id)
                      conversation_id, info
               FROM conversation_messages
               WHERE conversation_id IN ($placeholders)
                 AND role = 'assistant'
                 AND info IS NOT NULL
                 AND info->>'score' != '0'
               ORDER BY conversation_id, created_at DESC""",
            *conversationIds.toTypedArray()
        )
        return rows.associate {
            it["conversation_id"].toString() to parseFeedbackInfo(it["info"])
        }
    }

    private fun parseConversationInfo(value: Any?): ConversationInfo {
        if (value == null) return ConversationInfo()
        return try {
            val json = when (value) {
                is String -> value
                is ByteArray -> String(value)
                else -> value.toString()
            }
            objectMapper.readValue(json, ConversationInfo::class.java)
        } catch (e: Exception) {
            ConversationInfo()
        }
    }

    private fun parseFeedbackInfo(value: Any?): FeedbackInfo {
        if (value == null) return FeedbackInfo()
        return try {
            val json = when (value) {
                is String -> value
                is ByteArray -> String(value)
                else -> value.toString()
            }
            objectMapper.readValue(json, FeedbackInfo::class.java)
        } catch (e: Exception) {
            FeedbackInfo()
        }
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

    private fun formatTime(value: Any?): String {
        return when (value) {
            is Timestamp -> value.toInstant().toString()
            is Instant -> value.toString()
            else -> value?.toString() ?: DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        }
    }

    private fun success(data: Any?): Map<String, Any?> {
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to data)
    }

    private fun error(code: Int, message: String): Map<String, Any?> {
        return mapOf("success" to false, "code" to code, "message" to message, "data" to null)
    }
}
