package com.chaitin.pandawiki.dto

import java.time.OffsetDateTime

data class ModelModeSetting(
    val mode: String = "auto",
    val auto_mode_api_key: String = "",
    val chat_model: String = "",
    val is_manual_embedding_updated: Boolean = false
)

data class SwitchModeReq(
    val mode: String,
    val auto_mode_api_key: String? = null,
    val chat_model: String? = null
)

data class SwitchModeResp(
    val message: String = "切换成功"
)

data class CreateModelReq(
    val type: String,
    val provider: String,
    val model: String,
    val base_url: String,
    val api_key: String? = null,
    val api_header: String? = null,
    val api_version: String? = null,
    val parameters: Map<String, Any?>? = null,
    val is_active: Boolean? = true
)

data class UpdateModelReq(
    val id: String,
    val type: String? = null,
    val provider: String? = null,
    val model: String? = null,
    val base_url: String? = null,
    val api_key: String? = null,
    val api_header: String? = null,
    val api_version: String? = null,
    val parameters: Map<String, Any?>? = null,
    val is_active: Boolean? = null
)

data class ModelListItem(
    val id: String?,
    val provider: String?,
    val model: String?,
    val api_key: String?,
    val api_header: String?,
    val base_url: String?,
    val api_version: String?,
    val type: String?,
    val is_active: Boolean?,
    val prompt_tokens: Long?,
    val completion_tokens: Long?,
    val total_tokens: Long?,
    val parameters: Map<String, Any?>?,
    val created_at: OffsetDateTime?,
    val updated_at: OffsetDateTime?
)

data class CheckModelReq(
    val provider: String,
    val model: String,
    val base_url: String,
    val api_key: String? = null,
    val api_header: String? = null,
    val api_version: String? = null,
    val type: String,
    val parameters: Map<String, Any?>? = null
)

data class CheckModelResp(
    val content: String = "ok",
    val error: String = ""
)

data class GetProviderModelListReq(
    val provider: String,
    val type: String,
    val base_url: String,
    val api_key: String? = null,
    val api_header: String? = null
)

data class ProviderModelListItem(
    val model: String
)

data class GetProviderModelListResp(
    val models: List<ProviderModelListItem> = emptyList(),
    val error: String = ""
)
