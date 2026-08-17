package com.chaitin.pandawiki.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.util.LinkedHashMap

/**
 * 开源版（Free）许可证信息。
 * Admin 前台登录后会调用 /api/v1/license，返回免费版即可满足界面判断。
 */
@RestController
class LicenseController {

    @GetMapping("/api/v1/license")
    fun license(): Map<String, Any?> = LinkedHashMap<String, Any?>().apply {
        put("success", true)
        put("message", "OK")
        put("code", 0)
        put("data", LinkedHashMap<String, Any?>().apply {
            put("edition", 3)          // LicenseEditionEnterprise，解锁知识库/管理员数量上限
            put("started_at", 0)
            put("expired_at", 0)
            put("state", 0)
        })
    }
}
