package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.dto.*
import com.chaitin.pandawiki.security.JwtService
import com.chaitin.pandawiki.service.StatService
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.*

/**
 * 统计接口：对齐 Admin 统计看板与前台访问日志埋点。
 */
@RestController
class StatController(
    private val statService: StatService,
    private val jwtService: JwtService
) {

    // ---------- 管理端统计接口 ----------

    @GetMapping("/api/v1/stat/count")
    fun count(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getCount(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/instant_count")
    fun instantCount(
        @RequestParam("kb_id") kbId: String,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getInstantCount(kbId))
    }

    @GetMapping("/api/v1/stat/instant_pages")
    fun instantPages(
        @RequestParam("kb_id") kbId: String,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getInstantPages(kbId))
    }

    @GetMapping("/api/v1/stat/geo_count")
    fun geoCount(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getGeoCount(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/conversation_distribution")
    fun conversationDistribution(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getConversationDistribution(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/hot_pages")
    fun hotPages(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getHotPages(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/referer_hosts")
    fun refererHosts(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getRefererHosts(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/browsers")
    fun browsers(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getBrowsers(kbId, coerceDay(day)))
    }

    @GetMapping("/api/v1/stat/hot_questions")
    fun hotQuestions(
        @RequestParam("kb_id") kbId: String,
        @RequestParam(name = "day", required = false, defaultValue = "1") day: Int,
        @RequestHeader("Authorization") authHeader: String
    ): Map<String, Any?> {
        jwtService.parseBearer(authHeader)
        return success(statService.getHotQuestions(kbId, coerceDay(day)))
    }

    // ---------- 前台访问日志埋点 ----------

    @PostMapping("/share/v1/stat/page")
    fun recordPage(
        @RequestBody req: RecordPageReq,
        @RequestHeader(value = "x-kb-id", required = false) kbIdHeader: String?,
        @RequestHeader(value = "x-pw-session-id", required = false) sessionId: String?,
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
        @RequestHeader(value = "Referer", required = false) referer: String?,
        request: HttpServletRequest
    ): Map<String, Any?> {
        val kbId = kbIdHeader?.trim()
            ?: request.getParameter("kb_id")?.trim()
            ?: throw IllegalArgumentException("kb_id is required")

        val userId = try {
            authHeader?.let { jwtService.parseBearer(it)?.let { claims -> jwtService.userId(claims) } }
        } catch (e: Exception) {
            null
        }

        val ip = extractClientIp(request)

        statService.recordPage(
            kbId = kbId,
            sessionId = sessionId,
            userId = userId,
            scene = req.scene,
            nodeId = req.nodeId?.ifBlank { null },
            ip = ip,
            ua = userAgent,
            referer = referer
        )
        return success(null)
    }

    // ---------- 私有工具 ----------

    private fun success(data: Any?): Map<String, Any?> {
        return mapOf(
            "success" to true,
            "code" to 0,
            "message" to "OK",
            "data" to data
        )
    }

    private fun coerceDay(day: Int): Int {
        return if (day in listOf(1, 7, 30, 90)) day else 1
    }

    private fun extractClientIp(request: HttpServletRequest): String {
        val headers = listOf("X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP")
        for (h in headers) {
            val value = request.getHeader(h)
            if (!value.isNullOrBlank() && !value.equals("unknown", ignoreCase = true)) {
                return value.split(",")[0].trim()
            }
        }
        return request.remoteAddr ?: "unknown"
    }
}
