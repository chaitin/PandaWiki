package com.chaitin.pandawiki.controller

import com.chaitin.pandawiki.security.JwtService
import com.chaitin.pandawiki.service.PromptService
import io.jsonwebtoken.Claims
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 提示词配置接口（对齐 Go 后端 pro 接口 /api/pro/v1/prompt）。
 */
@RestController
@RequestMapping("/api/pro/v1/prompt")
class PromptController(
    private val promptService: PromptService,
    private val jwtService: JwtService
) {

    data class PromptResp(
        val content: String?,
        val summary_content: String?,
        val enable_preset: Boolean,
        val enable_preset_auto_language: Boolean,
        val enable_preset_general_info: Boolean,
        val enable_preset_reference: Boolean
    )

    data class UpdatePromptReq(
        val kb_id: String,
        val content: String? = null,
        val summary_content: String? = null,
        val enable_preset: Boolean? = null,
        val enable_preset_auto_language: Boolean? = null,
        val enable_preset_general_info: Boolean? = null,
        val enable_preset_reference: Boolean? = null
    )

    @GetMapping
    fun getPrompt(
        @RequestParam kb_id: String,
        @RequestHeader(value = "Authorization", required = false) authHeader: String,
        response: HttpServletResponse
    ): Map<String, Any?> {
        val claims = requireLogin(response, authHeader) ?: return emptyMap()
        if (!checkKbPermission(claims, kb_id)) {
            return error(response, HttpStatus.FORBIDDEN.value(), "无权访问该知识库")
        }

        val prompt = promptService.getPrompt(kb_id)
        val data = PromptResp(
            content = prompt.content,
            summary_content = prompt.summary_content,
            enable_preset = prompt.enable_preset,
            enable_preset_auto_language = prompt.enable_preset_auto_language,
            enable_preset_general_info = prompt.enable_preset_general_info,
            enable_preset_reference = prompt.enable_preset_reference
        )
        return success(data)
    }

    @PutMapping
    fun updatePrompt(
        @RequestBody req: UpdatePromptReq,
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

        val existing = promptService.getPrompt(req.kb_id)
        val updated = promptService.updatePrompt(
            req.kb_id,
            PromptService.Prompt(
                content = req.content ?: existing.content,
                summary_content = req.summary_content ?: existing.summary_content,
                enable_preset = req.enable_preset ?: existing.enable_preset,
                enable_preset_auto_language = req.enable_preset_auto_language ?: existing.enable_preset_auto_language,
                enable_preset_general_info = req.enable_preset_general_info ?: existing.enable_preset_general_info,
                enable_preset_reference = req.enable_preset_reference ?: existing.enable_preset_reference
            )
        )
        val data = PromptResp(
            content = updated.content,
            summary_content = updated.summary_content,
            enable_preset = updated.enable_preset,
            enable_preset_auto_language = updated.enable_preset_auto_language,
            enable_preset_general_info = updated.enable_preset_general_info,
            enable_preset_reference = updated.enable_preset_reference
        )
        return success(data)
    }

    /**
     * 简单权限校验：管理员默认允许访问所有知识库。
     * 后续如需细粒度 kb_users 权限，可在此扩展。
     */
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
