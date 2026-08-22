package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.security.KbAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 知识库用户管理接口（Wiki 站管理员，对齐 Go handler/v1/knowledge_base.go 的 userGroup）：
 * - GET    /api/v1/knowledge_base/user/list    列表（kb 普通用户 + 全部全局 admin）
 * - POST   /api/v1/knowledge_base/user/invite  添加用户到知识库
 * - PATCH  /api/v1/knowledge_base/user/update  修改知识库权限
 * - DELETE /api/v1/knowledge_base/user/delete  从知识库移除
 *
 * 权限模型：invite / update / delete 需要该知识库 full_control（全局 admin 或 kb_users.full_control）；
 * 全局 admin 用户不可被邀请/修改/删除，列表中始终出现且 perms=full_control。
 * 响应格式：{success, code, message, data}，前端 httpClient 自动解包 data。
 */
@RestController
@RequestMapping("/api/v1/knowledge_base/user")
@RequiredArgsConstructor
public class KbUserController {

    private static final Set<String> VALID_PERMS = Set.of("full_control", "doc_manage", "data_operate");

    private final JdbcTemplate jdbcTemplate;
    private final KbAccessService kbAccessService;

    record InviteReq(String kb_id, String user_id, String perm) {
    }

    record UpdateReq(String kb_id, String user_id, String perm) {
    }

    @GetMapping("/list")
    public Map<String, Object> list(@RequestParam("kb_id") String kbId,
                                    HttpServletRequest request, HttpServletResponse response) {
        if (!kbAccessService.requireLogin(request, response)) return null;

        List<Map<String, Object>> items = new ArrayList<>();

        // ① 已加入该知识库的普通用户（role='user'），按加入时间倒序
        List<Map<String, Object>> members = jdbcTemplate.queryForList(
                "SELECT k.user_id, u.account, k.perm FROM kb_users k "
                        + "JOIN users u ON u.id = k.user_id "
                        + "WHERE k.kb_id = ? AND u.role = 'user' ORDER BY k.created_at DESC",
                kbId);
        for (Map<String, Object> m : members) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.get("user_id"));
            item.put("account", m.get("account"));
            item.put("role", "user");
            item.put("perms", m.get("perm"));
            items.add(item);
        }

        // ② 全部全局 admin（自带 full_control，不存 kb_users）
        List<Map<String, Object>> admins = jdbcTemplate.queryForList(
                "SELECT id, account FROM users WHERE role = 'admin' ORDER BY created_at DESC");
        for (Map<String, Object> a : admins) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", a.get("id"));
            item.put("account", a.get("account"));
            item.put("role", "admin");
            item.put("perms", "full_control");
            items.add(item);
        }

        return ok(items);
    }

    @PostMapping("/invite")
    public Map<String, Object> invite(@RequestBody InviteReq req,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (req.kb_id == null || req.kb_id.isBlank() || req.user_id == null || req.user_id.isBlank()) {
            return error(response, 400, "kb_id 和 user_id 不能为空");
        }
        if (!kbAccessService.requireFullControl(request, response, req.kb_id)) return null;
        if (req.perm == null || !VALID_PERMS.contains(req.perm)) {
            return error(response, 400, "权限值只能是 full_control / doc_manage / data_operate");
        }

        Map<String, Object> target = findUser(req.user_id);
        if (target == null) return error(response, 404, "用户不存在");
        if ("admin".equals(target.get("role"))) return error(response, 400, "不能邀请超级管理员");

        try {
            jdbcTemplate.update(
                    "INSERT INTO kb_users (kb_id, user_id, perm) VALUES (?, ?, ?)",
                    req.kb_id, req.user_id, req.perm);
        } catch (Exception e) {
            // 依赖 kb_users UNIQUE(kb_id, user_id) 兜底重复邀请
            return error(response, 400, "该用户已在知识库中");
        }
        return ok(Map.of("message", "添加成功"));
    }

    @PatchMapping("/update")
    public Map<String, Object> update(@RequestBody UpdateReq req,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (req.kb_id == null || req.kb_id.isBlank() || req.user_id == null || req.user_id.isBlank()) {
            return error(response, 400, "kb_id 和 user_id 不能为空");
        }
        if (!kbAccessService.requireFullControl(request, response, req.kb_id)) return null;
        if (req.perm == null || !VALID_PERMS.contains(req.perm)) {
            return error(response, 400, "权限值只能是 full_control / doc_manage / data_operate");
        }

        Map<String, Object> target = findUser(req.user_id);
        if (target == null) return error(response, 404, "用户不存在");
        if ("admin".equals(target.get("role"))) return error(response, 400, "不能修改超级管理员权限");

        int updated = jdbcTemplate.update(
                "UPDATE kb_users SET perm = ? WHERE kb_id = ? AND user_id = ?",
                req.perm, req.kb_id, req.user_id);
        if (updated == 0) return error(response, 404, "该用户不在知识库中");
        return ok(Map.of("message", "更新成功"));
    }

    @DeleteMapping("/delete")
    public Map<String, Object> delete(@RequestParam("kb_id") String kbId,
                                      @RequestParam("user_id") String userId,
                                      HttpServletRequest request, HttpServletResponse response) {
        if (!kbAccessService.requireFullControl(request, response, kbId)) return null;

        Map<String, Object> target = findUser(userId);
        if (target == null) return error(response, 404, "用户不存在");
        if ("admin".equals(target.get("role"))) return error(response, 400, "不能删除超级管理员");

        int deleted = jdbcTemplate.update(
                "DELETE FROM kb_users WHERE kb_id = ? AND user_id = ?", kbId, userId);
        if (deleted == 0) return error(response, 404, "该用户不在知识库中");
        return ok(Map.of("message", "删除成功"));
    }

    private Map<String, Object> findUser(String userId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, account, role FROM users WHERE id = ?", userId);
        return rows.isEmpty() ? null : rows.get(0);
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
