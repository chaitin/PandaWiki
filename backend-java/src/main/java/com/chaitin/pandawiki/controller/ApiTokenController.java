package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.security.KbAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * API Token 管理接口（对齐 Go Pro handler 语义，供外部平台以机器身份接入）：
 * - POST   /api/pro/v1/token/create  创建 API Token（生成随机 token，前端复制保存）
 * - GET    /api/pro/v1/token/list    列表（前端自行脱敏展示）
 * - PATCH  /api/pro/v1/token/update  更新名称 / 权限
 * - DELETE /api/pro/v1/token/delete  吊销（删除）
 *
 * 权限模型：全部需要该知识库 full_control（全局 admin 或 kb_users.full_control）。
 * Token 约定：以 "pw_" 开头 + 32 位十六进制（不含 "."），
 * 便于 ApiTokenAuthFilter 用「是否含 .」区分 JWT 与 API Token。
 */
@RestController
@RequestMapping("/api/pro/v1/token")
@RequiredArgsConstructor
public class ApiTokenController {

    private static final Set<String> VALID_PERMS = Set.of("full_control", "doc_manage", "data_operate");
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    private final JdbcTemplate jdbcTemplate;
    private final KbAccessService kbAccessService;

    record CreateReq(String kb_id, String name, String permission) {
    }

    record UpdateReq(String kb_id, String id, String name, String permission) {
    }

    @PostMapping("/create")
    public Map<String, Object> create(@RequestBody CreateReq req,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (req.kb_id == null || req.kb_id.isBlank()) {
            return error(response, 400, "kb_id 不能为空");
        }
        if (!kbAccessService.requireFullControl(request, response, req.kb_id)) return null;
        if (req.name == null || req.name.isBlank()) {
            return error(response, 400, "name 不能为空");
        }
        String permission = (req.permission == null || req.permission.isBlank())
                ? "full_control" : req.permission;
        if (!VALID_PERMS.contains(permission)) {
            return error(response, 400, "权限值只能是 full_control / doc_manage / data_operate");
        }

        String id = UUID.randomUUID().toString();
        String token = "pw_" + UUID.randomUUID().toString().replace("-", "");
        String userId = kbAccessService.currentUserId(request);
        if (userId == null) userId = "";

        jdbcTemplate.update(
                "INSERT INTO api_tokens (id, kb_id, name, user_id, token, permission, created_at, updated_at) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, req.kb_id, req.name, userId, token, permission,
                OffsetDateTime.now(), OffsetDateTime.now());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", id);
        data.put("name", req.name);
        data.put("token", token);
        data.put("permission", permission);
        data.put("created_at", TS.format(OffsetDateTime.now()));
        data.put("updated_at", TS.format(OffsetDateTime.now()));
        return ok(data);
    }

    @GetMapping("/list")
    public Map<String, Object> list(@RequestParam("kb_id") String kbId,
                                    HttpServletRequest request, HttpServletResponse response) {
        if (!kbAccessService.requireFullControl(request, response, kbId)) return null;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, kb_id, name, user_id, token, permission, created_at, updated_at "
                        + "FROM api_tokens WHERE kb_id = ? ORDER BY created_at DESC", kbId);

        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", r.get("id"));
            item.put("name", r.get("name"));
            item.put("token", r.get("token"));
            item.put("permission", r.get("permission"));
            item.put("created_at", fmt(r.get("created_at")));
            item.put("updated_at", fmt(r.get("updated_at")));
            items.add(item);
        }
        return ok(items);
    }

    @PatchMapping("/update")
    public Map<String, Object> update(@RequestBody UpdateReq req,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (req.kb_id == null || req.kb_id.isBlank() || req.id == null || req.id.isBlank()) {
            return error(response, 400, "kb_id 和 id 不能为空");
        }
        if (!kbAccessService.requireFullControl(request, response, req.kb_id)) return null;
        if (req.permission != null && !VALID_PERMS.contains(req.permission)) {
            return error(response, 400, "权限值只能是 full_control / doc_manage / data_operate");
        }

        if (req.name != null) {
            jdbcTemplate.update(
                    "UPDATE api_tokens SET name = ?, updated_at = ? WHERE id = ? AND kb_id = ?",
                    req.name, OffsetDateTime.now(), req.id, req.kb_id);
        }
        if (req.permission != null) {
            jdbcTemplate.update(
                    "UPDATE api_tokens SET permission = ?, updated_at = ? WHERE id = ? AND kb_id = ?",
                    req.permission, OffsetDateTime.now(), req.id, req.kb_id);
        }
        return ok(Map.of("message", "更新成功"));
    }

    @DeleteMapping("/delete")
    public Map<String, Object> delete(@RequestParam("kb_id") String kbId,
                                      @RequestParam("id") String id,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (!kbAccessService.requireFullControl(request, response, kbId)) return null;

        int deleted = jdbcTemplate.update(
                "DELETE FROM api_tokens WHERE id = ? AND kb_id = ?", id, kbId);
        if (deleted == 0) return error(response, 404, "API Token 不存在");
        return ok(Map.of("message", "删除成功"));
    }

    private String fmt(Object ts) {
        return ts == null ? null : ts.toString();
    }

    private Map<String, Object> ok(Object data) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("success", true);
        map.put("code", 0);
        map.put("message", "OK");
        map.put("data", data != null ? data : Map.of());
        return map;
    }

    private Map<String, Object> error(HttpServletResponse response, int status, String message) {
        response.setStatus(status);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("success", false);
        map.put("message", message);
        return map;
    }
}
