package com.chaitin.pandawiki.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.LinkedHashMap

/**
 * App 前台 /share/pro/v1/auth 系列接口。
 *
 * 当前公开知识库（无访问认证）的场景下，为水印提供"访客溯源标识"：
 * - username 由 x-pw-session-id（中间件为每个访客生成的会话 ID）派生为 `访客xxxx`
 * - 水印展示该标识后，泄露截图可凭它到 stat 访问日志表按 session_id 反查 IP / UA / 访问轨迹
 * - 后续接入访问认证后，可在此返回真实登录用户名，优先展示真实身份
 */
@RestController
@RequestMapping("/share/pro/v1/auth")
class ShareAuthController {

    @GetMapping("/info")
    fun info(
        @RequestHeader(value = "x-pw-session-id", required = false) sessionId: String?,
    ): Map<String, Any?> {
        val guestId = sessionId?.takeLast(8)?.takeIf { it.isNotBlank() }
        val data = LinkedHashMap<String, Any?>().apply {
            put("id", null)
            put("username", guestId?.let { "访客$it" } ?: "")
            put("avatar_url", "")
            put("email", "")
        }
        return LinkedHashMap<String, Any?>().apply {
            put("success", true)
            put("message", "OK")
            put("code", 0)
            put("data", data)
        }
    }
}