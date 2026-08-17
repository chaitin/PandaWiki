package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.security.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * 用户管理接口（对齐 Go 后端 handler/v1/user.go）：
 * - POST   /api/v1/user/create         创建用户（管理员）
 * - GET    /api/v1/user/list           用户列表（登录）
 * - DELETE /api/v1/user/delete         删除用户（管理员）
 * - PUT    /api/v1/user/reset_password 重置密码（管理员）
 */
@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /** 免费版限制：后台管理员最多 1 个 */
    private static final int MAX_ADMIN = 1;

    record CreateUserReq(String account, String password, String role) {
    }

    record ResetPasswordReq(String id, String new_password) {
    }

    @PostMapping("/create")
    public Map<String, Object> create(@RequestBody CreateUserReq req, HttpServletResponse response,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        // 仅管理员可创建用户
        Claims claims = requireAdmin(response, authHeader);
        if (claims == null) return null;

        if (req.account == null || req.account.isBlank() || req.password == null || req.password.length() < 8) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "账号不能为空，密码长度至少 8 位");
        }
        String role = (req.role == null || req.role.isBlank()) ? "user" : req.role;
        if (!"admin".equals(role) && !"user".equals(role)) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "角色只能是 admin 或 user");
        }

        // 账号唯一性检查
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE account = ?", Integer.class, req.account);
        if (exists != null && exists > 0) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "账号已存在");
        }

        // 免费版限制：admin 最多 1 个
        if ("admin".equals(role)) {
            Integer adminCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin'", Integer.class);
            if (adminCount != null && adminCount >= MAX_ADMIN) {
                return error(response, HttpStatus.BAD_REQUEST.value(), "已超出免费版管理员数量上限");
            }
        }

        String uid = UUID.randomUUID().toString();
        String hash = passwordEncoder.encode(req.password);
        jdbcTemplate.update(
                "INSERT INTO users (id, account, password, role, created_at) VALUES (?, ?, ?, ?, ?)",
                uid, req.account, hash, role, OffsetDateTime.now());

        return Map.of("id", uid);
    }

    @GetMapping("/list")
    public Map<String, Object> list(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                    HttpServletResponse response) {
        // 登录即可查看用户列表
        try {
            jwtService.parseBearer(authHeader);
        } catch (Exception e) {
            return error(response, HttpStatus.UNAUTHORIZED.value(), "Token 无效或已过期");
        }

        List<Map<String, Object>> users = jdbcTemplate.queryForList(
                "SELECT id, account, role, created_at, last_access FROM users ORDER BY created_at DESC");
        List<Map<String, Object>> items = users.stream().map(u -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", u.get("id"));
            item.put("account", u.get("account"));
            item.put("role", u.get("role"));
            item.put("created_at", formatTs(u.get("created_at")));
            item.put("last_access", formatTs(u.get("last_access")));
            return item;
        }).toList();

        return Map.of("users", items);
    }

    @DeleteMapping("/delete")
    public Map<String, Object> delete(@RequestParam("user_id") String userId, HttpServletResponse response,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Claims claims = requireAdmin(response, authHeader);
        if (claims == null) return null;

        String currentId = jwtService.userId(claims);
        if (currentId.equals(userId)) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "不能删除自己的账号");
        }

        String targetAccount = jdbcTemplate.queryForObject(
                "SELECT account FROM users WHERE id = ?", String.class, userId);
        if (targetAccount == null) {
            return error(response, HttpStatus.NOT_FOUND.value(), "用户不存在");
        }
        if ("admin".equals(targetAccount)) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "不能删除内置 admin 账号");
        }

        jdbcTemplate.update("DELETE FROM users WHERE id = ?", userId);
        jdbcTemplate.update("DELETE FROM kb_users WHERE user_id = ?", userId);
        return Map.of("message", "删除成功");
    }

    @PutMapping("/reset_password")
    public Map<String, Object> resetPassword(@RequestBody ResetPasswordReq req, HttpServletResponse response,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Claims claims = requireAdmin(response, authHeader);
        if (claims == null) return null;

        if (req.id == null || req.id.isBlank() || req.new_password == null || req.new_password.length() < 8) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "密码长度至少 8 位");
        }

        Map<String, Object> target = jdbcTemplate.queryForMap("SELECT account, role FROM users WHERE id = ?", req.id);
        String targetAccount = (String) target.get("account");
        String targetRole = (String) target.get("role");

        // 内置 admin 不能通过此接口改自己的密码
        if ("admin".equals(targetAccount) && jwtService.userId(claims).equals(req.id)) {
            return error(response, HttpStatus.BAD_REQUEST.value(),
                    "请修改安装目录下 .env 文件中的 ADMIN_PASSWORD，并重启 panda-wiki-api 服务使更改生效。");
        }
        // 管理员不能修改其他管理员密码（除内置 admin 账号外）
        if ("admin".equals(targetRole) && !jwtService.userId(claims).equals(req.id)
                && !"admin".equals(targetAccount)) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "无法修改其他超级管理员密码");
        }

        String hash = passwordEncoder.encode(req.new_password);
        jdbcTemplate.update("UPDATE users SET password = ? WHERE id = ?", hash, req.id);
        return Map.of("message", "密码已重置");
    }

    private Claims requireAdmin(HttpServletResponse response, String authHeader) {
        try {
            Claims claims = jwtService.parseBearer(authHeader);
            if (!"admin".equals(jwtService.role(claims))) {
                error(response, HttpStatus.FORBIDDEN.value(), "仅管理员可执行此操作");
                return null;
            }
            return claims;
        } catch (Exception e) {
            error(response, HttpStatus.UNAUTHORIZED.value(), "Token 无效或已过期");
            return null;
        }
    }

    private Map<String, Object> error(HttpServletResponse response, int status, String message) {
        response.setStatus(status);
        return Map.of("success", false, "message", message);
    }

    private String formatTs(Object ts) {
        if (ts instanceof Timestamp t) {
            return t.toInstant().toString();
        }
        return ts != null ? ts.toString() : null;
    }
}
