package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.security.JwtService
import com.fasterxml.jackson.databind.ObjectMapper
import io.jsonwebtoken.Claims
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 反馈相关接口：
 * - POST /share/v1/chat/feedback    App 前台点赞/点踩
 * - GET  /api/v1/conversation/message/list  Admin 评价列表
 *
 * 对齐 Go 后端行为。
 */
@RestController
class FeedbackController(
    private val jdbcTemplate: JdbcTemplate,
    private val jwtService: JwtService,
    private val objectMapper: ObjectMapper
) {

    data class FeedbackRequest(
        val conversation_id: String? = null,
        val message_id: String,
        val score: Int? = null,
        val type: String? = null,
        val feedback_content: String? = null
    )

    data class MessageListReq(
        val kb_id: String,
        val page: Int = 1,
        val per_page: Int = 20
    )

    data class FeedbackInfo(
        val score: Int = 0,
        val feedback_type: String? = null,
        val feedback_content: String? = null
    )

    data class ConversationInfo(
        val user_info: UserInfo = UserInfo()
    )

    data class UserInfo(
        val auth_user_id: Long = 0,
        val user_name: String? = null,
        val email: String? = null,
        val avatar: String? = null
    )

    data class ConversationMessageListItem(
        val id: String? = null,
        val app_id: String? = null,
        val app_type: Int = 0,
        val conversation_id: String? = null,
        val question: String? = null,
        val remote_ip: String? = null,
        val created_at: String? = null,
        val conversation_info: ConversationInfo = ConversationInfo(),
        val info: FeedbackInfo = FeedbackInfo()
    )

    @PostMapping("/share/v1/chat/feedback")
    fun feedback(
        @RequestBody req: FeedbackRequest,
        @RequestHeader("x-kb-id") kbIdHeader: String?,
        request: HttpServletRequest
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader)
            ?: return error(HttpStatus.BAD_REQUEST.value(), "缺少知识库 ID")

        val message = jdbcTemplate.queryForList(
            "SELECT id, conversation_id, info FROM conversation_messages WHERE id = ? AND kb_id = ?",
            req.message_id, kbId
        ).firstOrNull() ?: return error(HttpStatus.NOT_FOUND.value(), "消息不存在")

        val existingInfo = parseInfo(message["info"])
        if (existingInfo.score != 0) {
            return error(HttpStatus.BAD_REQUEST.value(), "already voted for this message, please do not vote again")
        }

        val newInfo = FeedbackInfo(
            score = req.score ?: 0,
            feedback_type = req.type,
            feedback_content = req.feedback_content
        )
        jdbcTemplate.update(
            "UPDATE conversation_messages SET info = ?::jsonb WHERE id = ?",
            objectMapper.writeValueAsString(newInfo), req.message_id
        )
        return success("success")
    }

    @GetMapping("/api/v1/conversation/message/list")
    fun messageList(
        @RequestParam kb_id: String,
        @RequestParam page: Int,
        @RequestParam per_page: Int,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireAdmin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            response.status = HttpStatus.FORBIDDEN.value()
            return error(HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val offset = (page - 1) * per_page
        val count = jdbcTemplate.queryForObject(
            """SELECT COUNT(*) FROM conversation_messages cm
               JOIN conversations c ON c.id = cm.conversation_id
               WHERE c.kb_id = ? AND cm.role = 'assistant'
                 AND cm.info IS NOT NULL AND cm.info->>'score' != '0'""",
            Long::class.java, kb_id
        ) ?: 0L

        val rows = jdbcTemplate.queryForList(
            """SELECT cm.id, cm.app_id, cm.conversation_id, cm.remote_ip, cm.info, cm.created_at,
                      u.content AS question, cm.content AS answer
               FROM conversation_messages cm
               JOIN conversations c ON c.id = cm.conversation_id
               LEFT JOIN LATERAL (
                   SELECT content FROM conversation_messages
                   WHERE conversation_id = cm.conversation_id AND role = 'user'
                     AND created_at < cm.created_at ORDER BY created_at DESC LIMIT 1
               ) u ON true
               WHERE c.kb_id = ? AND cm.role = 'assistant'
                 AND cm.info IS NOT NULL AND cm.info->>'score' != '0'
               ORDER BY cm.created_at DESC
               LIMIT ? OFFSET ?""",
            kb_id, per_page, offset
        )

        val list = rows.map { row ->
            val info = parseInfo(row["info"])
            ConversationMessageListItem(
                id = row["id"].toString(),
                app_id = row["app_id"]?.toString(),
                conversation_id = row["conversation_id"]?.toString(),
                question = row["question"]?.toString(),
                remote_ip = row["remote_ip"]?.toString(),
                created_at = row["created_at"]?.toString(),
                info = info
            )
        }

        return success(mapOf("data" to list, "total" to count))
    }

    private fun parseInfo(value: Any?): FeedbackInfo {
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

    private fun resolveKbId(header: String?): String? {
        if (!header.isNullOrBlank()) return header
        return jdbcTemplate.queryForList(
            "SELECT id FROM knowledge_bases ORDER BY created_at LIMIT 1"
        ).firstOrNull()?.get("id") as? String
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
