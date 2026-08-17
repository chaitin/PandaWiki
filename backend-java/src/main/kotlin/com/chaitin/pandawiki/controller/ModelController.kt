package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.dto.CheckModelReq
import com.chaitin.pandawiki.dto.CheckModelResp
import com.chaitin.pandawiki.dto.CreateModelReq
import com.chaitin.pandawiki.dto.GetProviderModelListReq
import com.chaitin.pandawiki.dto.GetProviderModelListResp
import com.chaitin.pandawiki.dto.ModelListItem
import com.chaitin.pandawiki.dto.ModelModeSetting
import com.chaitin.pandawiki.dto.ProviderModelListItem
import com.chaitin.pandawiki.dto.SwitchModeReq
import com.chaitin.pandawiki.dto.SwitchModeResp
import com.chaitin.pandawiki.dto.UpdateModelReq
import com.chaitin.pandawiki.entity.Model
import com.chaitin.pandawiki.entity.SystemSetting
import com.chaitin.pandawiki.repository.ModelRepository
import com.chaitin.pandawiki.repository.SystemSettingRepository
import com.chaitin.pandawiki.service.ModelService
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.net.HttpURLConnection
import java.net.URL
import java.time.OffsetDateTime
import java.util.UUID

@RestController
@RequestMapping("/api/v1/model")
class ModelController(
    private val systemSettingRepository: SystemSettingRepository,
    private val modelRepository: ModelRepository,
    private val modelService: ModelService,
    private val objectMapper: com.fasterxml.jackson.databind.ObjectMapper
) {

    companion object {
        const val MODEL_SETTING_MODE_KEY = "model_setting_mode"
    }

    @GetMapping("/mode-setting")
    fun getModeSetting(): ModelModeSetting {
        val setting = systemSettingRepository.findByKey(MODEL_SETTING_MODE_KEY)
        if (setting == null) {
            return ModelModeSetting()
        }
        val value = setting.value
        return ModelModeSetting(
            mode = value["mode"] as? String ?: "auto",
            auto_mode_api_key = value["auto_mode_api_key"] as? String ?: "",
            chat_model = value["chat_model"] as? String ?: "",
            is_manual_embedding_updated = value["is_manual_embedding_updated"] as? Boolean ?: false
        )
    }

    @PostMapping("/switch-mode")
    fun switchMode(@RequestBody req: SwitchModeReq): SwitchModeResp {
        val existing = systemSettingRepository.findByKey(MODEL_SETTING_MODE_KEY)
        val now = OffsetDateTime.now()
        val newValue = when (req.mode) {
            "auto" -> mutableMapOf(
                "mode" to "auto",
                "auto_mode_api_key" to (req.auto_mode_api_key ?: ""),
                "chat_model" to (req.chat_model ?: ""),
                "is_manual_embedding_updated" to (existing?.value?.get("is_manual_embedding_updated") as? Boolean ?: false)
            )
            else -> mutableMapOf(
                "mode" to "manual",
                "auto_mode_api_key" to "",
                "chat_model" to "",
                "is_manual_embedding_updated" to false
            )
        }
        if (existing == null) {
            systemSettingRepository.save(
                SystemSetting(
                    key = MODEL_SETTING_MODE_KEY,
                    value = newValue,
                    description = "Model setting mode configuration",
                    createdAt = now,
                    updatedAt = now
                )
            )
        } else {
            existing.value = newValue
            existing.updatedAt = now
            systemSettingRepository.save(existing)
        }
        return SwitchModeResp()
    }

    @GetMapping("/list")
    fun list(): List<ModelListItem> {
        return modelRepository.findAll().map { it.toListItem() }
    }

    @PostMapping
    fun create(@RequestBody req: CreateModelReq): ModelListItem {
        val now = OffsetDateTime.now()
        val entity = Model(
            id = UUID.randomUUID().toString(),
            type = req.type,
            provider = req.provider,
            model = req.model,
            baseUrl = req.base_url,
            apiKey = req.api_key,
            apiHeader = req.api_header,
            apiVersion = req.api_version,
            parameters = req.parameters,
            isActive = req.is_active,
            promptTokens = 0,
            completionTokens = 0,
            totalTokens = 0,
            createdAt = now,
            updatedAt = now
        )
        return modelRepository.save(entity).toListItem()
    }

    @PutMapping
    fun update(@RequestBody req: UpdateModelReq): Map<String, Any> {
        val entity = modelRepository.findById(req.id).orElseThrow {
            IllegalArgumentException("模型不存在")
        }
        req.type?.let { entity.type = it }
        req.provider?.let { entity.provider = it }
        req.model?.let { entity.model = it }
        req.base_url?.let { entity.baseUrl = it }
        req.api_key?.let { entity.apiKey = it }
        req.api_header?.let { entity.apiHeader = it }
        req.api_version?.let { entity.apiVersion = it }
        req.parameters?.let { entity.parameters = it }
        req.is_active?.let { entity.isActive = it }
        entity.updatedAt = OffsetDateTime.now()
        modelRepository.save(entity)
        return mapOf("message" to "更新成功")
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): Map<String, Any> {
        modelRepository.deleteById(id)
        return mapOf("message" to "删除成功")
    }

    data class AnalyzeDocumentReq(val content: String, val prompt: String? = null)
    data class AnalyzeDocumentResp(val result: String, val model_type: String = "analysis")

    /**
     * 文档分析：调用 analysis 模型对文本内容进行分析提炼。
     */
    @PostMapping("/analyze")
    fun analyzeDocument(@RequestBody req: AnalyzeDocumentReq): Map<String, Any?> {
        val result = modelService.analyzeDocument(req.content, req.prompt)
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to AnalyzeDocumentResp(result))
    }

    data class AnalyzeImageReq(val image_urls: List<String>, val prompt: String? = null)
    data class AnalyzeImageResp(val result: String, val model_type: String = "analysis-vl")

    /**
     * 图像分析：调用 analysis-vl 视觉模型对图片进行分析。
     */
    @PostMapping("/analyze-image")
    fun analyzeImage(@RequestBody req: AnalyzeImageReq): Map<String, Any?> {
        val result = modelService.analyzeImage(req.image_urls, req.prompt)
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to AnalyzeImageResp(result))
    }

    @PostMapping("/check")
    fun check(@RequestBody req: CheckModelReq): CheckModelResp {
        val baseUrl = req.base_url.trimEnd('/')
        if (baseUrl.isEmpty()) {
            return CheckModelResp(error = "缺少接口地址")
        }
        if (req.model.isBlank()) {
            return CheckModelResp(error = "缺少模型名称")
        }
        if (req.api_key.isNullOrBlank() && req.api_header.isNullOrBlank()) {
            return CheckModelResp(error = "缺少 API Key 或自定义鉴权头")
        }

        val modelType = when (req.type) {
            "analysis", "analysis-vl" -> "chat"
            else -> req.type
        }

        val (url, body) = when (modelType) {
            "chat" -> {
                "$baseUrl/chat/completions" to mapOf<String, Any?>(
                    "model" to req.model,
                    "messages" to listOf(mapOf("role" to "user", "content" to "你好")),
                    "stream" to false,
                    "max_tokens" to 10
                )
            }
            "embedding" -> {
                "$baseUrl/embeddings" to mapOf<String, Any?>(
                    "model" to req.model,
                    "input" to "test",
                    "encoding_format" to "float"
                )
            }
            "rerank" -> {
                "$baseUrl/rerank" to mapOf<String, Any?>(
                    "model" to req.model,
                    "query" to "test",
                    "documents" to listOf("test document"),
                    "top_n" to 1
                )
            }
            else -> return CheckModelResp(error = "不支持的模型类型: ${req.type}")
        }

        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Accept", "application/json")
            if (!req.api_header.isNullOrBlank() && req.api_header.contains(":")) {
                val parts = req.api_header.split(":", limit = 2)
                conn.setRequestProperty(parts[0].trim(), parts[1].trim())
            } else {
                conn.setRequestProperty("Authorization", "Bearer ${req.api_key}")
            }

            conn.outputStream.use { it.write(objectMapper.writeValueAsBytes(body)) }

            val code = conn.responseCode
            if (code !in 200..299) {
                val err = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                return CheckModelResp(error = "模型请求失败 (HTTP $code): ${err.take(500)}")
            }

            val responseBody = conn.inputStream.bufferedReader().use { it.readText() }
            val tree = objectMapper.readTree(responseBody)

            when (modelType) {
                "chat" -> {
                    val content = tree.path("choices").get(0)?.path("message")?.path("content")?.asText()
                    if (content.isNullOrBlank()) {
                        CheckModelResp(error = "模型返回内容为空")
                    } else {
                        CheckModelResp(content = "检测成功")
                    }
                }
                "embedding" -> {
                    val embedding = tree.path("data").get(0)?.path("embedding")
                    if (embedding == null || embedding.isEmpty) {
                        CheckModelResp(error = "embedding 返回格式异常")
                    } else {
                        CheckModelResp(content = "检测成功")
                    }
                }
                "rerank" -> {
                    val results = tree.path("results")
                    if (results == null || results.isEmpty) {
                        CheckModelResp(error = "rerank 返回格式异常")
                    } else {
                        CheckModelResp(content = "检测成功")
                    }
                }
                else -> CheckModelResp(error = "不支持的模型类型: ${req.type}")
            }
        } catch (e: Exception) {
            CheckModelResp(error = "检测失败: ${e.message}")
        }
    }

    @PostMapping("/provider/supported")
    fun providerSupported(@RequestBody req: GetProviderModelListReq): GetProviderModelListResp {
        // 真实调用各平台 OpenAI 兼容的 /models 接口获取模型列表
        if (req.api_key.isNullOrBlank()) {
            return GetProviderModelListResp(error = "缺少 API Key")
        }
        val baseUrl = req.base_url.trimEnd('/')
        if (baseUrl.isEmpty()) {
            return GetProviderModelListResp(error = "缺少接口地址")
        }
        if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
            return GetProviderModelListResp(error = "接口地址格式不正确")
        }

        var conn: HttpURLConnection? = null
        try {
            val url = URL("$baseUrl/models")
            conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 10_000
            conn.readTimeout = 15_000
            conn.setRequestProperty("Accept", "application/json")
            // api_header 形如 "Authorization: Bearer xxx" 或 "X-API-Key: xxx"；为空则用默认 Bearer
            if (!req.api_header.isNullOrBlank() && req.api_header.contains(":")) {
                val parts = req.api_header.split(":", limit = 2)
                conn.setRequestProperty(parts[0].trim(), parts[1].trim())
            } else {
                conn.setRequestProperty("Authorization", "Bearer ${req.api_key}")
            }

            val code = conn.responseCode
            if (code != 200) {
                val errBody = conn.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                return GetProviderModelListResp(
                    error = "获取模型列表失败 (HTTP $code): ${errBody.take(300)}"
                )
            }

            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val tree = objectMapper.readTree(body)
            val ids = tree.get("data")
                ?.map { it.get("id")?.asText().orEmpty() }
                ?.filter { it.isNotBlank() }
                .orEmpty()
            if (ids.isEmpty()) {
                return GetProviderModelListResp(error = "接口返回了空模型列表")
            }
            return GetProviderModelListResp(models = ids.map { ProviderModelListItem(it) })
        } catch (e: Exception) {
            return GetProviderModelListResp(error = "获取模型列表失败: ${e.message}")
        } finally {
            conn?.disconnect()
        }
    }

    private fun Model.toListItem(): ModelListItem = ModelListItem(
        id = id,
        provider = provider,
        model = model,
        api_key = apiKey,
        api_header = apiHeader,
        base_url = baseUrl,
        api_version = apiVersion,
        type = type,
        is_active = isActive,
        prompt_tokens = promptTokens,
        completion_tokens = completionTokens,
        total_tokens = totalTokens,
        parameters = parameters,
        created_at = createdAt,
        updated_at = updatedAt
    )
}
