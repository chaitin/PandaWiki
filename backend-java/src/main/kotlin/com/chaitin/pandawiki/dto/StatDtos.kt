package com.chaitin.pandawiki.dto

import com.fasterxml.jackson.annotation.JsonProperty

// ---------- 请求 ----------

data class StatCountReq(
    @JsonProperty("kb_id")
    val kbId: String,
    val day: Int = 1
)

data class StatInstantReq(
    @JsonProperty("kb_id")
    val kbId: String
)

data class StatDayReq(
    @JsonProperty("kb_id")
    val kbId: String,
    val day: Int = 1
)

data class RecordPageReq(
    val scene: Int,
    @JsonProperty("node_id")
    val nodeId: String? = null
)

// ---------- 响应 ----------

data class StatCountResp(
    @JsonProperty("ip_count")
    val ipCount: Long = 0,
    @JsonProperty("session_count")
    val sessionCount: Long = 0,
    @JsonProperty("page_visit_count")
    val pageVisitCount: Long = 0,
    @JsonProperty("conversation_count")
    val conversationCount: Long = 0
)

data class InstantCountResp(
    val time: String,
    val count: Long = 0
)

data class InstantPageResp(
    val scene: Int? = null,
    @JsonProperty("node_id")
    val nodeId: String? = null,
    @JsonProperty("node_name")
    val nodeName: String? = null,
    val ip: String? = null,
    @JsonProperty("ip_address")
    val ipAddress: IpAddressResp? = null,
    @JsonProperty("created_at")
    val createdAt: String? = null,
    @JsonProperty("user_id")
    val userId: Long? = null,
    val info: UserInfoResp? = null
)

data class IpAddressResp(
    val country: String? = null,
    val province: String? = null,
    val city: String? = null,
    val ip: String? = null
)

data class UserInfoResp(
    @JsonProperty("avatar_url")
    val avatarUrl: String? = null,
    val email: String? = null,
    val username: String? = null
)

data class HotPageResp(
    val scene: Int? = null,
    @JsonProperty("node_id")
    val nodeId: String? = null,
    @JsonProperty("node_name")
    val nodeName: String? = null,
    val count: Long = 0
)

data class HotRefererResp(
    @JsonProperty("referer_host")
    val refererHost: String? = null,
    val count: Long = 0
)

data class BrowserCountResp(
    val name: String? = null,
    val count: Long = 0
)

data class HotBrowserResp(
    val os: List<BrowserCountResp> = emptyList(),
    val browser: List<BrowserCountResp> = emptyList()
)

data class ConversationDistributionResp(
    @JsonProperty("app_type")
    val appType: Int? = null,
    val count: Long = 0
)

data class HotQuestionResp(
    val question: String? = null,
    val count: Long = 0
)
