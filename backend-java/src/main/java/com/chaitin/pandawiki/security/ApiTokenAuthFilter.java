package com.chaitin.pandawiki.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

/**
 * API Token 鉴权过滤器（3.4）：
 * 对 /api/** 请求做「尽力而为」的鉴权上下文预填充——
 * 先尝试 JWT 解析；token 不含 "."（即 API Token，非 JWT）则回退查 api_tokens 表，
 * 命中后把 {kbId, permission, userId} 写入 request attribute，
 * 供各 Controller / KbAccessService 复用，使外部平台用 API Token 也能调用受控接口。
 *
 * 注意：本过滤器【不拦截】任何请求（现有 Controller 各自校验登录态，且大量接口本就开放），
 * 只负责预解析并暴露鉴权上下文，避免重复查库；401/403 仍由各 Controller 按需返回。
 */
@Component
@RequiredArgsConstructor
public class ApiTokenAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final KbAccessService kbAccessService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String raw = authHeader.substring(7);
            if (raw.contains(".")) {
                // JWT：解析成功则写入身份属性（失败留给 Controller 自行 401）
                try {
                    var claims = jwtService.parseBearer(authHeader);
                    request.setAttribute(KbAccessService.ATTR_TYPE, "jwt");
                    request.setAttribute(KbAccessService.ATTR_USER_ID, jwtService.userId(claims));
                    request.setAttribute(KbAccessService.ATTR_ACCOUNT, jwtService.account(claims));
                    request.setAttribute(KbAccessService.ATTR_ROLE, jwtService.role(claims));
                } catch (Exception ignored) {
                    // 非法 JWT：不在此拦截，交由具体 Controller 处理
                }
            } else {
                // API Token：查表，命中则写入上下文
                Map<String, Object> row = kbAccessService.findApiToken(raw);
                if (row != null) {
                    request.setAttribute(KbAccessService.ATTR_TYPE, "token");
                    request.setAttribute(KbAccessService.ATTR_USER_ID, row.get("user_id"));
                    request.setAttribute(KbAccessService.ATTR_KB_ID, row.get("kb_id"));
                    request.setAttribute(KbAccessService.ATTR_PERM, row.get("permission"));
                }
            }
        }
        chain.doFilter(request, response);
    }
}
