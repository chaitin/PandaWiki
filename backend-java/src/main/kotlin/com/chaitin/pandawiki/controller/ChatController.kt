package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.service.EmbeddingService
import com.chaitin.pandawiki.service.ModelService
import com.chaitin.pandawiki.service.PromptService
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

@RestController
@RequestMapping("/share/v1/chat")
class ChatController(
    private val jdbcTemplate: JdbcTemplate,
    private val modelService: ModelService,
    private val embeddingService: EmbeddingService,
    private val promptService: PromptService,
    private val objectMapper: ObjectMapper
) {

    data class ChatSearchReq(val message: String)
    data class ChatSearchResp(val node_result: List<NodeChunk>)
    data class NodeChunk(
        val node_id: String,
        val name: String,
        val summary: String,
        val emoji: String?,
        val node_path_names: List<String>
    )

    private fun resolveKbId(header: String?): String? {
        if (!header.isNullOrBlank()) return header
        return jdbcTemplate.queryForList(
            "SELECT id FROM knowledge_bases ORDER BY created_at LIMIT 1"
        ).firstOrNull()?.get("id") as? String
    }

    /**
     * 检索相关文档：优先向量检索（语义相似度），embedding 模型不可用时降级为关键词 ILIKE。
     */
    private fun searchNodes(kbId: String, keyword: String): List<NodeChunk> {
        if (keyword.isEmpty()) return emptyList()
        return try {
            embeddingService.ensureIndexed(kbId)
            embeddingService.search(kbId, keyword, topK = 5).map { hit ->
                val meta = hit.meta
                NodeChunk(
                    node_id = hit.nodeId,
                    name = hit.name,
                    summary = (meta?.get("summary") as? String) ?: hit.content.take(200),
                    emoji = meta?.get("emoji") as? String,
                    node_path_names = listOf(hit.name)
                )
            }
        } catch (e: Exception) {
            println("[DEBUG] 向量检索失败，降级为关键词检索: ${e.message}")
            keywordSearchNodes(kbId, keyword)
        }
    }

    /** 关键词检索（降级方案） */
    private fun keywordSearchNodes(kbId: String, keyword: String): List<NodeChunk> {
        val like = "%$keyword%"
        val rows = jdbcTemplate.queryForList(
            """SELECT id, name, content, meta FROM nodes
               WHERE kb_id = ? AND status = 2 AND type = 2
                 AND (name ILIKE ? OR content ILIKE ?)
               ORDER BY updated_at DESC NULLS LAST
               LIMIT 10""",
            kbId, like, like
        )
        return rows.map { row ->
            val meta = row["meta"] as? Map<*, *>
            NodeChunk(
                node_id = row["id"].toString(),
                name = row["name"].toString(),
                summary = (meta?.get("summary") as? String) ?: row["name"].toString(),
                emoji = meta?.get("emoji") as? String,
                node_path_names = listOf(row["name"].toString())
            )
        }
    }

    /** 手动触发某知识库的向量全量重建 */
    @PostMapping("/reindex")
    fun reindex(@RequestHeader("x-kb-id") kbIdHeader: String?): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader)
            ?: return mapOf("success" to false, "code" to 400, "message" to "缺少知识库 ID")
        val count = embeddingService.reindexKb(kbId)
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to mapOf("count" to count))
    }

    @PostMapping("/search")
    fun search(
        @RequestBody req: ChatSearchReq,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): Map<String, Any?> {
        val kbId = resolveKbId(kbIdHeader)
            ?: return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to ChatSearchResp(emptyList()))
        val result = searchNodes(kbId, req.message.trim())
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to ChatSearchResp(result))
    }

    @PostMapping("/completions")
    fun completions(
        @RequestBody req: Map<String, Any?>,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): Map<String, Any?> {
        val messages = req["messages"] as? List<Map<String, Any?>>
            ?: throw IllegalArgumentException("缺少 messages")
        val userMessage = messages.lastOrNull { it["role"] == "user" }?.get("content")?.toString()
            ?: throw IllegalArgumentException("缺少用户消息")

        val kbId = resolveKbId(kbIdHeader)
        val chunks = if (kbId == null) emptyList() else searchNodes(kbId, userMessage.trim())

        val context = if (chunks.isEmpty()) {
            ""
        } else {
            "以下是从知识库中检索到的相关内容：\n" +
                chunks.joinToString("\n---\n") { "文档：${it.name}\n${it.summary}" } +
                "\n---\n请基于以上内容回答用户问题。如果内容与问题无关，请直接回答。"
        }

        val systemMsg = buildSystemPrompt(kbId, context)

        val chatMessages: MutableList<Map<String, Any?>> = mutableListOf(
            mapOf("role" to "system", "content" to systemMsg)
        )
        chatMessages.addAll(messages.map { mapOf("role" to it["role"], "content" to it["content"]) })

        val answer = modelService.chat(
            chatMessages,
            maxTokens = (req["max_tokens"] as? Number)?.toInt() ?: 2048,
            temperature = (req["temperature"] as? Number)?.toDouble() ?: 0.3
        )

        return mapOf(
            "id" to "chatcmpl-${System.currentTimeMillis()}",
            "object" to "chat.completion",
            "created" to (System.currentTimeMillis() / 1000),
            "model" to req["model"],
            "choices" to listOf(
                mapOf(
                    "index" to 0,
                    "message" to mapOf("role" to "assistant", "content" to answer),
                    "finish_reason" to "stop"
                )
            ),
            "usage" to mapOf("prompt_tokens" to 0, "completion_tokens" to 0, "total_tokens" to 0)
        )
    }

    private fun streamChat(
        emitter: SseEmitter,
        userMessage: String,
        kbIdHeader: String?,
        conversationId: String?,
        nonce: String?
    ) {
        try {
            if (userMessage.isEmpty()) {
                sendSseEvent(emitter, "error", "消息不能为空")
                emitter.complete()
                return
            }

            val kbId = resolveKbId(kbIdHeader)
            val chunks = if (kbId == null) emptyList() else searchNodes(kbId, userMessage)

            val convId = conversationId?.takeIf { it.isNotBlank() }
                ?: "conv-${System.currentTimeMillis()}"
            val messageId = "msg-${System.currentTimeMillis()}-${(0..9999).random()}"

            sendSseEvent(emitter, "conversation_id", convId)
            sendSseEvent(emitter, "message_id", messageId)
            nonce?.takeIf { it.isNotBlank() }?.let {
                sendSseEvent(emitter, "nonce", it)
            }

            chunks.forEach { chunk ->
                sendSseEvent(
                    emitter,
                    "chunk_result",
                    "",
                    mapOf(
                        "id" to chunk.node_id,
                        "node_id" to chunk.node_id,
                        "name" to chunk.name,
                        "summary" to chunk.summary,
                        "emoji" to (chunk.emoji ?: ""),
                        "score" to 1.0,
                        "node_path_names" to chunk.node_path_names
                    )
                )
            }

            val context = if (chunks.isEmpty()) {
                ""
            } else {
                "以下是从知识库中检索到的相关内容：\n" +
                    chunks.joinToString("\n---\n") { "文档：${it.name}\n${it.summary}" } +
                    "\n---\n请基于以上内容回答用户问题。如果内容与问题无关，请直接回答。"
            }

            val systemMsg = buildSystemPrompt(kbId, context)

            val chatMessages = mutableListOf<Map<String, Any?>>(
                mapOf("role" to "system", "content" to systemMsg),
                mapOf("role" to "user", "content" to userMessage)
            )

            val answer = modelService.chat(chatMessages)

            val chunkSize = 8
            for (i in answer.indices step chunkSize) {
                val end = minOf(i + chunkSize, answer.length)
                sendSseEvent(emitter, "data", answer.substring(i, end))
            }

            sendSseEvent(emitter, "done", "")
            emitter.complete()
        } catch (e: Exception) {
            sendSseEvent(emitter, "error", e.message ?: "回答生成失败")
            emitter.complete()
        }
    }

    @PostMapping("/message")
    fun message(
        @RequestBody req: Map<String, Any?>,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): SseEmitter {
        val emitter = SseEmitter(120_000L)
        Thread {
            streamChat(
                emitter,
                req["message"]?.toString()?.trim() ?: "",
                kbIdHeader,
                req["conversation_id"]?.toString(),
                req["nonce"]?.toString()
            )
        }.start()
        return emitter
    }

    @PostMapping("/widget")
    fun widget(
        @RequestBody req: Map<String, Any?>,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): SseEmitter {
        val emitter = SseEmitter(120_000L)
        Thread {
            streamChat(
                emitter,
                req["message"]?.toString()?.trim() ?: "",
                kbIdHeader,
                req["conversation_id"]?.toString(),
                req["nonce"]?.toString()
            )
        }.start()
        return emitter
    }

    /**
     * 构造系统提示词：优先使用知识库配置的 CardAI 提示词，再拼接检索上下文。
     */
    private fun buildSystemPrompt(kbId: String?, context: String): String {
        val basePrompt = if (kbId.isNullOrBlank()) {
            "你是一个 helpful 的 AI 助手。"
        } else {
            try {
                promptService.getPromptContent(kbId)
            } catch (e: Exception) {
                "你是一个知识库问答助手。"
            }
        }
        return if (context.isEmpty()) {
            basePrompt
        } else {
            "$basePrompt\n\n$context"
        }
    }

    private fun sendSseEvent(
        emitter: SseEmitter,
        type: String,
        content: String,
        chunkResult: Map<String, Any?>? = null
    ) {
        val data = mutableMapOf<String, Any?>(
            "type" to type,
            "content" to content
        )
        if (chunkResult != null) {
            data["chunk_result"] = chunkResult
        }
        emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(data)))
    }

    @PostMapping("/widget/search")
    fun widgetSearch(
        @RequestBody req: ChatSearchReq,
        @RequestHeader("x-kb-id") kbIdHeader: String?
    ): Map<String, Any?> {
        return search(req, kbIdHeader)
    }
}
