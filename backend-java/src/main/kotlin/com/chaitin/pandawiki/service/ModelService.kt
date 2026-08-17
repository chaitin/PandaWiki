package com.chaitin.pandawiki.service

import com.chaitin.pandawiki.entity.Model
import com.chaitin.pandawiki.repository.ModelRepository
import com.fasterxml.jackson.databind.ObjectMapper
import kotlin.jvm.JvmOverloads
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import java.net.HttpURLConnection
import java.net.URL

@Service
class ModelService(
    private val modelRepository: ModelRepository,
    private val objectMapper: ObjectMapper
) {

    data class ModelConfig(
        val baseUrl: String,
        val apiKey: String,
        val apiHeader: String?,
        val model: String,
        val parameters: Map<String, Any?>?
    )

    private fun getActiveModel(type: String): ModelConfig {
        val model = modelRepository.findByTypeAndIsActiveTrue(type)
            ?: throw IllegalStateException("未找到类型为 $type 的激活模型，请先配置模型")
        val baseUrl = (model.baseUrl ?: "").trimEnd('/')
        if (baseUrl.isEmpty()) throw IllegalStateException("模型 $type 未配置 API 地址")
        val apiKey = model.apiKey ?: ""
        if (apiKey.isBlank()) throw IllegalStateException("模型 $type 未配置 API Key")
        return ModelConfig(baseUrl, apiKey, model.apiHeader, model.model ?: "", model.parameters)
    }

    /**
     * 获取指定类型模型配置；若该类型未激活则返回 null，便于可选模型（如 analysis-vl）优雅降级。
     */
    private fun getActiveModelOrNull(type: String): ModelConfig? {
        val model = modelRepository.findByTypeAndIsActiveTrue(type) ?: return null
        val baseUrl = (model.baseUrl ?: "").trimEnd('/')
        if (baseUrl.isEmpty() || model.apiKey.isNullOrBlank()) return null
        return ModelConfig(baseUrl, model.apiKey!!, model.apiHeader, model.model ?: "", model.parameters)
    }

    private fun openConnection(url: String, config: ModelConfig): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 30_000
        conn.readTimeout = 120_000
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Accept", "application/json")
        if (!config.apiHeader.isNullOrBlank() && config.apiHeader.contains(":")) {
            val parts = config.apiHeader.split(":", limit = 2)
            conn.setRequestProperty(parts[0].trim(), parts[1].trim())
        } else {
            conn.setRequestProperty("Authorization", "Bearer ${config.apiKey}")
        }
        return conn
    }

    private fun doPost(url: String, config: ModelConfig, body: Map<String, Any?>): String {
        var conn: HttpURLConnection? = null
        try {
            conn = openConnection(url, config)
            conn.outputStream.use { it.write(objectMapper.writeValueAsBytes(body)) }
            val code = conn.responseCode
            val responseBody = if (code in 200..299) {
                conn.inputStream.bufferedReader().use { it.readText() }
            } else {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                throw RuntimeException("模型请求失败 (HTTP $code): ${err.take(500)}")
            }
            return responseBody
        } finally {
            conn?.disconnect()
        }
    }

    @JvmOverloads
    fun chat(messages: List<Map<String, Any?>>, maxTokens: Int = 2048, temperature: Double = 0.3): String {
        return chatByType("chat", messages, maxTokens, temperature)
    }

    /**
     * 按指定模型类型执行对话调用；若该类型未配置，可选模型会降级到 chat 模型。
     */
    fun chatByType(
        type: String,
        messages: List<Map<String, Any?>>,
        maxTokens: Int = 2048,
        temperature: Double = 0.3,
        fallbackToChat: Boolean = true
    ): String {
        val config = getActiveModelOrNull(type)
            ?: if (fallbackToChat && type != "chat") getActiveModel("chat") else getActiveModel(type)
        val params = config.parameters ?: emptyMap()
        val body = mutableMapOf<String, Any?>(
            "model" to config.model,
            "messages" to messages,
            "stream" to false
        )
        body["max_tokens"] = (params["max_output_tokens"] as? Number)?.toInt() ?: maxTokens
        body["temperature"] = (params["temperature"] as? Number)?.toDouble() ?: temperature
        val response = doPost("${config.baseUrl}/chat/completions", config, body)
        val tree = objectMapper.readTree(response)
        val content = tree.path("choices").get(0)?.path("message")?.path("content")?.asText()
        return content?.trim() ?: throw RuntimeException("模型返回内容为空")
    }

    /**
     * 文档分析：使用 analysis 模型对文本内容进行分析/提炼。
     * 未配置 analysis 模型时降级到 chat 模型，保证功能可用。
     */
    fun analyzeDocument(content: String, prompt: String? = null): String {
        val systemPrompt = prompt ?: "你是一个文档分析助手，请对以下内容进行结构化分析，提炼关键信息。"
        val messages = listOf(
            mapOf("role" to "system", "content" to systemPrompt),
            mapOf("role" to "user", "content" to content)
        )
        return chatByType("analysis", messages, fallbackToChat = true)
    }

    /**
     * 图像分析：使用 analysis-vl 视觉模型对图片进行分析。
     * 视觉模型为可选配置；未配置时尝试降级到 chat 模型（仅分析图片 URL 文本描述）。
     */
    fun analyzeImage(imageUrls: List<String>, prompt: String? = null): String {
        val userPrompt = prompt ?: "请描述这些图片的内容，并提取其中的关键信息。"
        val vlConfig = getActiveModelOrNull("analysis-vl")
        val messages: List<Map<String, Any?>>
        val config: ModelConfig

        if (vlConfig != null) {
            config = vlConfig
            val content = mutableListOf<Map<String, Any?>>(
                mapOf("type" to "text", "text" to userPrompt)
            )
            imageUrls.forEach { url ->
                content.add(mapOf("type" to "image_url", "image_url" to mapOf("url" to url)))
            }
            messages = listOf(mapOf("role" to "user", "content" to content))
        } else {
            // 未配置视觉模型时降级到 chat 模型，传入图片 URL 作为文本提示
            config = getActiveModel("chat")
            val text = "$userPrompt\n图片地址：\n${imageUrls.joinToString("\n")}"
            messages = listOf(mapOf("role" to "user", "content" to text))
        }

        val params = config.parameters ?: emptyMap()
        val body = mutableMapOf<String, Any?>(
            "model" to config.model,
            "messages" to messages,
            "stream" to false
        )
        body["max_tokens"] = (params["max_output_tokens"] as? Number)?.toInt() ?: 2048
        body["temperature"] = (params["temperature"] as? Number)?.toDouble() ?: 0.3
        val response = doPost("${config.baseUrl}/chat/completions", config, body)
        val tree = objectMapper.readTree(response)
        val content = tree.path("choices").get(0)?.path("message")?.path("content")?.asText()
        return content?.trim() ?: throw RuntimeException("模型返回内容为空")
    }

    fun embedding(text: String): FloatArray {
        val config = getActiveModel("embedding")
        val body = mapOf(
            "model" to config.model,
            "input" to text,
            "encoding_format" to "float"
        )
        val response = doPost("${config.baseUrl}/embeddings", config, body)
        val tree = objectMapper.readTree(response)
        val embeddingNode = tree.path("data").get(0)?.path("embedding")
            ?: throw RuntimeException("embedding 返回格式异常")
        return embeddingNode.map { it.floatValue() }.toFloatArray()
    }

    fun rerank(query: String, documents: List<String>): List<Double> {
        val config = getActiveModel("rerank")
        val body = mapOf(
            "model" to config.model,
            "query" to query,
            "documents" to documents,
            "top_n" to documents.size
        )
        val response = doPost("${config.baseUrl}/rerank", config, body)
        val tree = objectMapper.readTree(response)
        val results = tree.path("results")
        val scores = MutableList(documents.size) { 0.0 }
        results?.forEach { node ->
            val idx = node.path("index").asInt(0)
            val score = node.path("relevance_score").asDouble(0.0)
            if (idx in scores.indices) scores[idx] = score
        }
        return scores
    }

    fun chatModel(): Model? = modelRepository.findByTypeAndIsActiveTrue("chat")
}
