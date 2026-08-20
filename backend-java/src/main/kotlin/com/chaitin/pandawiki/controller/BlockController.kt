package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.security.JwtService
import com.chaitin.pandawiki.service.BlockWordService
import io.jsonwebtoken.Claims
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 敏感词管理接口（对齐 Go 后端 /api/pro/v1/block）。
 */
@RestController
@RequestMapping("/api/pro/v1/block")
class BlockController(
    private val blockWordService: BlockWordService,
    private val jwtService: JwtService
) {

    data class BlockWordsResp(val words: List<String>)

    data class UpdateBlockWordsReq(
        val kb_id: String,
        val block_words: List<String> = emptyList()
    )

    @GetMapping
    fun getBlockWords(
        @RequestParam kb_id: String,
        @RequestHeader(value = "Authorization", required = false) authHeader: String,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireLogin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            return error(response, HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val words = blockWordService.getBlockWords(kb_id)
        return success(BlockWordsResp(words = words))
    }

    @PostMapping
    fun updateBlockWords(
        @RequestBody req: UpdateBlockWordsReq,
        @RequestHeader(value = "Authorization", required = false) authHeader: String,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireAdmin(response, authHeader) ?: return emptyMap()
        if (req.kb_id.isBlank()) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "缺少知识库 ID")
        }
        if (!checkKbPermission(claims, req.kb_id)) {
            return error(response, HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        blockWordService.saveBlockWords(req.kb_id, req.block_words)
        return success(null)
    }

    private fun checkKbPermission(claims: Claims, kbId: String): Boolean {
        return "admin" == jwtService.role(claims)
    }

    private fun requireLogin(response: HttpServletResponse, authHeader: String?): Claims? {
        return try {
            jwtService.parseBearer(authHeader)
        } catch (e: Exception) {
            error(response, HttpStatus.UNAUTHORIZED.value(), "Token 无效或已过期")
            null
        }
    }

    private fun requireAdmin(response: HttpServletResponse, authHeader: String?): Claims? {
        return try {
            val claims = jwtService.parseBearer(authHeader)
            if ("admin" != jwtService.role(claims)) {
                error(response, HttpStatus.FORBIDDEN.value(), "仅管理员可执行此操作")
                return null
            }
            claims
        } catch (e: Exception) {
            error(response, HttpStatus.UNAUTHORIZED.value(), "Token 无效或已过期")
            null
        }
    }

    private fun success(data: Any?): Map<String, Any?> {
        return mapOf("success" to true, "code" to 0, "message" to "OK", "data" to data)
    }

    private fun error(response: HttpServletResponse, status: Int, message: String): Map<String, Any?> {
        response.setStatus(status)
        return mapOf("success" to false, "code" to status, "message" to message, "data" to null)
    }
}
