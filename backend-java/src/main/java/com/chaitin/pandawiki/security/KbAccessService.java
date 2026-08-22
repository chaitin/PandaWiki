package com.chaitin.pandawiki.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * 知识库访问控制帮助类（对齐 Go 版 usecase/knowledge_base.go 的权限校验语义）。
 *
 * 三层权限模型：
 *   1. JWT 全局管理员（users.role == 'admin'）→ 直接 full_control，绕过 kb_users
 *   2. JWT 普通用户 → 查 kb_users 表取该知识库的 perm
 *   3. API Token（不含 "." 的非 JWT）→ 查 api_tokens 表取 permission（按 kb 隔离）
 *
 * ApiTokenAuthFilter 已把解析结果写入 request attribute，
 * 这里优先读 attribute，读不到再现场解析（保证过滤器未生效也能正常工作）。
 */
@Component
@RequiredArgsConstructor
public class KbAccessService {

    private final JwtService jwtService;
    private final JdbcTemplate jdbcTemplate;

    /** 鉴权上下文对应的 request attribute 名（由 ApiTokenAuthFilter 写入） */
    public static final String ATTR_TYPE = "panda.auth.type";      // jwt | token
    public static final String ATTR_USER_ID = "panda.auth.user_id";
    public static final String ATTR_ACCOUNT = "panda.auth.account";
    public static final String ATTR_ROLE = "panda.auth.role";
    public static final String ATTR_PERM = "panda.auth.perm";
    public static final String ATTR_KB_ID = "panda.auth.kb_id";

    /**
     * 解析当前调用者在指定知识库的权限。
     * - admin 角色 → full_control
     * - 普通用户 → kb_users.perm（未加入返回空串）
     * - API Token → api_tokens.permission（kb 不匹配返回空串）
     */
    public String resolvePerm(HttpServletRequest request, String kbId) {
        if ("token".equals(request.getAttribute(ATTR_TYPE))) {
            String tokenKbId = (String) request.getAttribute(ATTR_KB_ID);
            String perm = (String) request.getAttribute(ATTR_PERM);
            if (tokenKbId == null || !tokenKbId.equals(kbId)) return "";
            return perm != null ? perm : "";
        }
        return resolvePermFromAuthHeader(request.getHeader("Authorization"), kbId);
    }

    /** 从原始 Authorization 头解析权限（不依赖过滤器，供无 Filter 场景使用） */
    public String resolvePermFromAuthHeader(String authHeader, String kbId) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return "";
        String raw = authHeader.substring(7);
        try {
            if (!raw.contains(".")) {
                // API Token：按 token 查表
                Map<String, Object> row = findApiToken(raw);
                if (row == null) return "";
                if (!kbId.equals(row.get("kb_id"))) return "";
                return String.valueOf(row.get("permission"));
            }
            Claims claims = jwtService.parseBearer(authHeader);
            if ("admin".equals(jwtService.role(claims))) return "full_control";
            String userId = jwtService.userId(claims);
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT perm FROM kb_users WHERE kb_id = ? AND user_id = ?", kbId, userId);
            if (rows.isEmpty()) return "";
            return String.valueOf(rows.get(0).get("perm"));
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * 校验调用者对指定知识库的权限是否在 allowed 集合内；
     * 不满足则写 403 响应并返回 null（满足返回实际 perm）。
     */
    public String requirePerm(HttpServletRequest request, HttpServletResponse response,
                              String kbId, Collection<String> allowed) {
        String perm = resolvePerm(request, kbId);
        if (perm != null && !perm.isEmpty() && allowed.contains(perm)) {
            return perm;
        }
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        writeError(response, "权限不足，需要 " + allowed + " 之一");
        return null;
    }

    /** 校验是否有 full_control（管理员或知识库完全控制） */
    public boolean requireFullControl(HttpServletRequest request, HttpServletResponse response, String kbId) {
        return requirePerm(request, response, kbId, List.of("full_control")) != null;
    }

    /** 校验是否已登录（任意合法 JWT 或 API Token），未登录写 401 */
    public boolean requireLogin(HttpServletRequest request, HttpServletResponse response) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            writeError(response, "未授权");
            return false;
        }
        String raw = authHeader.substring(7);
        try {
            if (raw.contains(".")) {
                jwtService.parseBearer(authHeader);
                return true;
            }
            if (findApiToken(raw) != null) return true;
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            writeError(response, "Token 无效或已过期");
            return false;
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            writeError(response, "Token 无效或已过期");
            return false;
        }
    }

    /** 按 token 值查 api_tokens，返回整行（含 kb_id / permission / user_id），未命中返回 null */
    public Map<String, Object> findApiToken(String token) {
        if (token == null || token.isBlank()) return null;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, kb_id, name, user_id, permission FROM api_tokens WHERE token = ?", token);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** 从 request attribute 取当前调用者（可能为 null） */
    public String currentUserId(HttpServletRequest request) {
        Object uid = request.getAttribute(ATTR_USER_ID);
        return uid != null ? uid.toString() : null;
    }

    private void writeError(HttpServletResponse response, String message) {
        try {
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"" + message + "\"}");
        } catch (Exception ignored) {
        }
    }
}
