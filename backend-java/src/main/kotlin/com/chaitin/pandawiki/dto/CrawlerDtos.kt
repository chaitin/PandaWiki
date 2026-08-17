package com.chaitin.pandawiki.dto

import com.fasterxml.jackson.annotation.JsonProperty

/**
 * 文档导入相关 DTO，与前端 AddDocByType 对齐。
 */

// ---------- Setting ----------

data class FeishuSetting(
    @JsonProperty("app_id")
    val appId: String? = null,
    @JsonProperty("app_secret")
    val appSecret: String? = null,
    @JsonProperty("user_access_token")
    val userAccessToken: String? = null,
    @JsonProperty("space_id")
    val spaceId: String? = null
)

data class DingtalkSetting(
    @JsonProperty("app_id")
    val appId: String? = null,
    @JsonProperty("app_secret")
    val appSecret: String? = null,
    @JsonProperty("unionid")
    val unionid: String? = null,
    @JsonProperty("phone")
    val phone: String? = null,
    @JsonProperty("space_id")
    val spaceId: String? = null
)

// ---------- Request ----------

data class ParseReq(
    @JsonProperty("kb_id")
    val kbId: String? = null,
    @JsonProperty("crawler_source")
    val crawlerSource: String? = null,
    val key: String? = null,
    val filename: String? = null,
    @JsonProperty("feishu_setting")
    val feishuSetting: FeishuSetting? = null,
    @JsonProperty("dingtalk_setting")
    val dingtalkSetting: DingtalkSetting? = null
)

data class ExportReq(
    @JsonProperty("kb_id")
    val kbId: String? = null,
    val id: String? = null,
    @JsonProperty("doc_id")
    val docId: String? = null,
    @JsonProperty("space_id")
    val spaceId: String? = null,
    @JsonProperty("file_type")
    val fileType: String? = null
)

data class ResultReq(
    @JsonProperty("task_id")
    val taskId: String? = null
)

data class ResultsReq(
    @JsonProperty("task_ids")
    val taskIds: List<String>? = null
)

// ---------- Response ----------

data class ParseResp(
    var id: String? = null,
    var docs: DocsTree? = null
)

data class ExportResp(
    @JsonProperty("task_id")
    var taskId: String? = null
)

data class ResultResp(
    var status: String? = null,
    var content: String? = null
)

data class ResultsResp(
    var status: String? = null,
    var list: List<ResultItem>? = null
)

data class ResultItem(
    @JsonProperty("task_id")
    var taskId: String? = null,
    var status: String? = null,
    var content: String? = null
)

// ---------- 文档树 ----------

/**
 * 文档树节点，与前端 AnydocChild 对齐。
 */
data class DocsTree(
    val value: DocValue? = null,
    val children: List<DocsTree>? = null
)

/**
 * 文档树节点值，与前端 AnydocValue 对齐。
 */
data class DocValue(
    val id: String? = null,
    val title: String? = null,
    val summary: String? = null,
    @JsonProperty("file_type")
    val fileType: String? = null,
    val file: Boolean? = null
)
