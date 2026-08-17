package com.chaitin.pandawiki.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * JWT 解析工具：与 AuthController 使用相同的 secret，供各 Controller 校验登录态。
 */
@Component
public class JwtService {

    private final SecretKey signingKey;

    public JwtService(@Value("${panda.jwt.secret}") String jwtSecret) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 从 Authorization: Bearer xxx 中解析 token，返回 Claims；无效或过期时抛出异常。
     */
    public Claims parseBearer(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new IllegalArgumentException("未授权");
        }
        String token = authHeader.substring(7);
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String userId(Claims claims) {
        return claims.get("id", String.class);
    }

    public String account(Claims claims) {
        return claims.get("account", String.class);
    }

    public String role(Claims claims) {
        return claims.get("role", String.class);
    }
}
