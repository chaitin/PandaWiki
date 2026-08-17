package com.chaitin.pandawiki.controller

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.time.format.DateTimeFormatter

/**
 * 对话详情接口（对齐 App 前台 /share/v1/conversation/detail）。
 */
@RestController
@RequestMapping("/share/v1/conversation")
class ConversationController(
    private val jdbcTemplate: JdbcTemplate
) {

    @GetMapping("/detail")
    fun detail(@RequestParam("id") conversationId: String): Map<String, Any?> {
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

        return mapOf(
            "success" to true,
            "code" to 0,
            "message" to "OK",
            "data" to data
        )
    }

    private fun formatTime(value: Any?): String {
        return when (value) {
            is java.sql.Timestamp -> value.toInstant().toString()
            is Instant -> value.toString()
            else -> value?.toString() ?: DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        }
    }
}
