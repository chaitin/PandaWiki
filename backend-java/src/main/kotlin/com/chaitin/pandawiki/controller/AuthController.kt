package com.chaitin.pandawiki.controller

import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RestController
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.crypto.SecretKey

data class LoginReq(val account: String, val password: String)

@Configuration
class AuthConfig {
    @Bean
    fun passwordEncoder(): BCryptPasswordEncoder = BCryptPasswordEncoder()
}

@RestController
class AuthController(
    private val jdbcTemplate: JdbcTemplate,
    private val passwordEncoder: BCryptPasswordEncoder,
    @Value("\${panda.jwt.secret}") private val jwtSecret: String
) {

    private val signingKey: SecretKey by lazy {
        Keys.hmacShaKeyFor(jwtSecret.toByteArray(StandardCharsets.UTF_8))
    }

    @PostMapping("/api/v1/user/login")
    fun login(@RequestBody req: LoginReq, response: HttpServletResponse): Map<String, Any> {
        val sql = "SELECT id, account, password, role FROM users WHERE account = ?"
        val users = jdbcTemplate.queryForList(sql, req.account)

        if (users.isEmpty()) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            return mapOf(
                "success" to false,
                "message" to "账号或密码错误"
            )
        }

        val user = users.first()
        val dbPasswordHash = user["password"] as String

        if (!passwordEncoder.matches(req.password, dbPasswordHash)) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            return mapOf(
                "success" to false,
                "message" to "账号或密码错误"
            )
        }

        val userId = user["id"] as String
        val account = user["account"] as String
        val role = user["role"] as String

        val now = Date()
        val expiration = Date(now.time + 24 * 60 * 60 * 1000)

        val token = Jwts.builder()
            .claim("id", userId)
            .claim("account", account)
            .claim("role", role)
            .issuedAt(now)
            .expiration(expiration)
            .signWith(signingKey)
            .compact()

        return mapOf(
            "token" to token
        )
    }

    @GetMapping("/api/v1/user")
    fun user(
        @RequestHeader(value = "Authorization", required = false) authHeader: String?,
        response: HttpServletResponse
    ): Map<String, Any> {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            return mapOf(
                "success" to false,
                "message" to "未授权"
            )
        }

        val token = authHeader.substring(7)
        return try {
            val claims: Claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .payload

            val userId = claims["id"] as String
            val account = claims["account"] as String
            val role = claims["role"] as String

            return mapOf(
                "id" to userId,
                "account" to account,
                "role" to role
            )
        } catch (e: Exception) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            return mapOf(
                "success" to false,
                "message" to "Token 无效或已过期"
            )
        }
    }
}
