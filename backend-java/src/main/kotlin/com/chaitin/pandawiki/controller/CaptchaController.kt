package com.chaitin.pandawiki.controller

import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * App 前台验证码接口，兼容 @cap.js/widget + go-cap 协议。
 * 当前实现：后端生成真实数学题，前端提交答案后校验，通过才允许调用 AI 问答接口。
 */
@RestController
@RequestMapping("/share/v1/captcha")
class CaptchaController {

    data class ChallengeItem(
        val c: Int,
        val d: Int,
        val s: Int
    )

    data class ChallengeData(
        val challenge: ChallengeItem,
        val expires: Long,
        val token: String
    )

    data class RedeemReq(
        val solutions: List<Int>?,
        val token: String?
    )

    data class VerificationResult(
        val success: Boolean,
        val message: String,
        val token: String,
        val expires: Long
    )

    // 内存中保留已发放的 token 与对应答案，redeem 时校验 solutions
    private val tokens = ConcurrentHashMap<String, CaptchaAnswer>()

    data class CaptchaAnswer(
        val answer: Int,
        val expires: Long
    )

    @PostMapping("/challenge")
    fun challenge(): ChallengeData {
        val token = UUID.randomUUID().toString()
        // 5 分钟后过期
        val expires = Instant.now().plusSeconds(300).toEpochMilli()

        // 生成真实数学题：两个 1~20 的整数相加
        val a = (1..20).random()
        val b = (1..20).random()
        val answer = a + b

        // c=1 表示 1 道题；d/s 占位，保持与 cap.js 协议兼容
        tokens[token] = CaptchaAnswer(answer = answer, expires = expires)
        return ChallengeData(
            challenge = ChallengeItem(c = 1, d = a, s = b),
            expires = expires,
            token = token
        )
    }

    @PostMapping("/redeem")
    fun redeem(@RequestBody req: RedeemReq): VerificationResult {
        val token = req.token ?: ""
        val answer = req.solutions?.firstOrNull()
        val stored = tokens[token]
            ?: return VerificationResult(
                success = false,
                message = "invalid token",
                token = token,
                expires = 0L
            )

        // 过期后删除
        if (Instant.now().toEpochMilli() > stored.expires) {
            tokens.remove(token)
            return VerificationResult(
                success = false,
                message = "token expired",
                token = token,
                expires = stored.expires
            )
        }

        if (answer == null || answer != stored.answer) {
            return VerificationResult(
                success = false,
                message = "答案错误，请重新验证",
                token = token,
                expires = stored.expires
            )
        }

        // 校验通过；移除该 token 防止重放
        tokens.remove(token)
        return VerificationResult(
            success = true,
            message = "ok",
            token = token,
            expires = stored.expires
        )
    }
}
