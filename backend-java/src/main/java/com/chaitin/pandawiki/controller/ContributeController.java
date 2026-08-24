package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.entity.Contribute;
import com.chaitin.pandawiki.entity.Node;
import com.chaitin.pandawiki.repository.ContributeRepository;
import com.chaitin.pandawiki.repository.NavRepository;
import com.chaitin.pandawiki.repository.NodeRepository;
import com.chaitin.pandawiki.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * 文档贡献模块：
 * - POST /share/pro/v1/contribute/submit  前台提交贡献
 * - GET  /api/pro/v1/contribute/list      后台贡献列表
 * - GET  /api/pro/v1/contribute/detail    后台贡献详情
 * - POST /api/pro/v1/contribute/audit     后台审核贡献
 */
@RestController
public class ContributeController {

    private static final String STATUS_PENDING = "pending";
    private static final String STATUS_APPROVED = "approved";
    private static final String STATUS_REJECTED = "rejected";
    private static final String TYPE_ADD = "add";
    private static final String TYPE_EDIT = "edit";

    private final JdbcTemplate jdbcTemplate;
    private final ContributeRepository contributeRepository;
    private final NodeRepository nodeRepository;
    private final NavRepository navRepository;
    private final JwtService jwtService;
    private final ObjectMapper objectMapper;

    public ContributeController(JdbcTemplate jdbcTemplate,
                                ContributeRepository contributeRepository,
                                NodeRepository nodeRepository,
                                NavRepository navRepository,
                                JwtService jwtService,
                                ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.contributeRepository = contributeRepository;
        this.nodeRepository = nodeRepository;
        this.navRepository = navRepository;
        this.jwtService = jwtService;
        this.objectMapper = objectMapper;
    }

    // ---------- DTOs ----------

    public record SubmitContributeReq(String captcha_token,
                                       String content,
                                       String content_type,
                                       String emoji,
                                       String name,
                                       String node_id,
                                       String reason,
                                       String type) {
    }

    public record AuditContributeReq(String id,
                                      String kb_id,
                                      String nav_id,
                                      String parent_id,
                                      Double position,
                                      String status) {
    }

    public record AuthInfo(String username, String avatar) {
    }

    // ---------- 前台：提交贡献 ----------

    @PostMapping("/share/pro/v1/contribute/submit")
    public Map<String, Object> submitContribute(@RequestBody SubmitContributeReq req,
                                                 @RequestHeader(value = "x-kb-id", required = false) String kbIdHeader,
                                                 HttpServletRequest request) {
        String kbId = resolveKbId(kbIdHeader);
        if (kbId == null) {
            return error(HttpStatus.BAD_REQUEST.value(), "缺少知识库 ID");
        }

        Map<String, Object> settings = getWebAppSettings(kbId);
        if (settings == null) {
            return error(HttpStatus.NOT_FOUND.value(), "app info is not found");
        }
        Object contributeSettingsObj = settings.get("contribute_settings");
        boolean isEnable = false;
        if (contributeSettingsObj instanceof Map<?, ?> contributeSettings) {
            Object enable = contributeSettings.get("is_enable");
            isEnable = Boolean.TRUE.equals(enable);
        }
        if (!isEnable) {
            return error(HttpStatus.BAD_REQUEST.value(), "文档贡献未开启");
        }

        if (req.reason() == null || req.reason().isBlank()) {
            return error(HttpStatus.BAD_REQUEST.value(), "更新说明不能为空");
        }
        if (!TYPE_ADD.equals(req.type()) && !TYPE_EDIT.equals(req.type())) {
            return error(HttpStatus.BAD_REQUEST.value(), "type 参数错误");
        }
        if (TYPE_EDIT.equals(req.type()) && (req.node_id() == null || req.node_id().isBlank())) {
            return error(HttpStatus.BAD_REQUEST.value(), "编辑贡献必须指定 node_id");
        }

        if (TYPE_EDIT.equals(req.type())) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id FROM nodes WHERE id = ? AND kb_id = ?",
                    req.node_id(), kbId
            );
            if (rows.isEmpty()) {
                return error(HttpStatus.NOT_FOUND.value(), "文档不存在");
            }
        }

        Map<String, Object> meta = new HashMap<>();
        if (req.content_type() != null && !req.content_type().isBlank()) {
            meta.put("content_type", req.content_type());
        }
        if (req.emoji() != null && !req.emoji().isBlank()) {
            meta.put("emoji", req.emoji());
        }

        Contribute contribute = new Contribute();
        contribute.setId(UUID.randomUUID().toString());
        contribute.setKbId(kbId);
        contribute.setType(req.type());
        contribute.setNodeId(req.node_id());
        contribute.setName(req.name() != null ? req.name() : "");
        contribute.setContent(req.content() != null ? req.content() : "");
        contribute.setReason(req.reason());
        contribute.setStatus(STATUS_PENDING);
        contribute.setRemoteIp(extractClientIp(request));
        contribute.setMeta(meta);
        contribute.setAuditUserId("");
        OffsetDateTime now = OffsetDateTime.now();
        contribute.setCreatedAt(now);
        contribute.setUpdatedAt(now);

        contributeRepository.save(contribute);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", contribute.getId());
        return success(data);
    }

    // ---------- 后台：贡献列表 ----------

    @GetMapping("/api/pro/v1/contribute/list")
    public Map<String, Object> listContributes(@RequestParam("kb_id") String kbId,
                                                @RequestParam(name = "node_name", required = false) String nodeName,
                                                @RequestParam(name = "auth_name", required = false) String authName,
                                                @RequestParam(name = "status", required = false) String status,
                                                @RequestParam("page") int page,
                                                @RequestParam("per_page") int perPage,
                                                @RequestHeader("Authorization") String authHeader) {
        jwtService.parseBearer(authHeader);

        int currentPage = Math.max(page - 1, 0);
        int pageSize = Math.max(perPage, 1);

        List<String> conditions = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        conditions.add("c.kb_id = ?");
        params.add(kbId);

        if (nodeName != null && !nodeName.isBlank()) {
            conditions.add("c.name ILIKE ?");
            params.add("%" + nodeName + "%");
        }
        if (status != null && !status.isBlank()) {
            conditions.add("c.status = ?");
            params.add(status);
        }

        List<Long> authIdFilter = null;
        if (authName != null && !authName.isBlank()) {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id FROM auths WHERE kb_id = ? AND user_info ->> 'username' ILIKE ?",
                    kbId, "%" + authName + "%"
            );
            authIdFilter = rows.stream()
                    .map(r -> ((Number) r.get("id")).longValue())
                    .toList();
            if (authIdFilter.isEmpty()) {
                Map<String, Object> empty = new LinkedHashMap<>();
                empty.put("list", List.of());
                empty.put("total", 0L);
                return success(empty);
            }
            conditions.add("c.auth_id IN (" + String.join(",", Collections.nCopies(authIdFilter.size(), "?")) + ")");
            params.addAll(authIdFilter);
        }

        String whereClause = String.join(" AND ", conditions);
        String countSql = "SELECT COUNT(*) FROM contributes c WHERE " + whereClause;
        Long total = jdbcTemplate.queryForObject(countSql, Long.class, params.toArray());
        if (total == null) total = 0L;

        String querySql = "SELECT c.* FROM contributes c WHERE " + whereClause
                + " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
        List<Object> queryParams = new ArrayList<>(params);
        queryParams.add(pageSize);
        queryParams.add((long) currentPage * pageSize);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(querySql, queryParams.toArray());
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            list.add(mapRowToListItem(row));
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("list", list);
        data.put("total", total);
        return success(data);
    }

    // ---------- 后台：贡献详情 ----------

    @GetMapping("/api/pro/v1/contribute/detail")
    public Map<String, Object> detailContribute(@RequestParam("id") String id,
                                                 @RequestParam("kb_id") String kbId,
                                                 @RequestHeader("Authorization") String authHeader) {
        jwtService.parseBearer(authHeader);

        Optional<Contribute> opt = contributeRepository.findById(id);
        if (opt.isEmpty()) {
            return error(HttpStatus.NOT_FOUND.value(), "贡献记录不存在");
        }
        Contribute contribute = opt.get();
        if (!kbId.equals(contribute.getKbId())) {
            return error(HttpStatus.BAD_REQUEST.value(), "贡献记录不属于该知识库");
        }

        return success(mapContributeToDetail(contribute));
    }

    // ---------- 后台：审核贡献 ----------

    @PostMapping("/api/pro/v1/contribute/audit")
    public Map<String, Object> auditContribute(@RequestBody AuditContributeReq req,
                                                @RequestHeader("Authorization") String authHeader) {
        Claims claims;
        try {
            claims = jwtService.parseBearer(authHeader);
        } catch (Exception e) {
            return error(HttpStatus.UNAUTHORIZED.value(), "未授权");
        }

        if (req.id() == null || req.id().isBlank()) {
            return error(HttpStatus.BAD_REQUEST.value(), "id 不能为空");
        }
        if (req.kb_id() == null || req.kb_id().isBlank()) {
            return error(HttpStatus.BAD_REQUEST.value(), "kb_id 不能为空");
        }
        if (req.status() == null || req.status().isBlank()) {
            return error(HttpStatus.BAD_REQUEST.value(), "status 不能为空");
        }
        if (!STATUS_APPROVED.equals(req.status()) && !STATUS_REJECTED.equals(req.status())) {
            return error(HttpStatus.BAD_REQUEST.value(), "status 参数错误");
        }

        Optional<Contribute> opt = contributeRepository.findById(req.id());
        if (opt.isEmpty()) {
            return error(HttpStatus.NOT_FOUND.value(), "贡献记录不存在");
        }
        Contribute contribute = opt.get();
        if (!req.kb_id().equals(contribute.getKbId())) {
            return error(HttpStatus.BAD_REQUEST.value(), "贡献记录不属于该知识库");
        }
        if (!STATUS_PENDING.equals(contribute.getStatus())) {
            return error(HttpStatus.BAD_REQUEST.value(), "该贡献已处理");
        }

        String auditUserId = jwtService.userId(claims);
        OffsetDateTime now = OffsetDateTime.now();

        if (STATUS_APPROVED.equals(req.status())) {
            if (TYPE_EDIT.equals(contribute.getType())) {
                Optional<Node> nodeOpt = nodeRepository.findById(contribute.getNodeId());
                if (nodeOpt.isEmpty()) {
                    return error(HttpStatus.NOT_FOUND.value(), "原文档不存在");
                }
                Node node = nodeOpt.get();
                node.setName(contribute.getName() != null && !contribute.getName().isBlank()
                        ? contribute.getName() : node.getName());
                node.setContent(contribute.getContent());

                Map<String, Object> meta = node.getMeta() != null
                        ? new HashMap<>(node.getMeta()) : new HashMap<>();
                if (contribute.getMeta() != null) {
                    if (contribute.getMeta().get("content_type") != null) {
                        meta.put("content_type", contribute.getMeta().get("content_type"));
                    }
                    if (contribute.getMeta().get("emoji") != null) {
                        meta.put("emoji", contribute.getMeta().get("emoji"));
                    }
                }
                node.setMeta(meta);

                Short nodeStatus = node.getStatus();
                Short nodeType = node.getType();
                if (nodeStatus != null && nodeStatus == 2 && nodeType != null && nodeType == 2) {
                    jdbcTemplate.update("DELETE FROM node_embeddings WHERE node_id = ?", node.getId());
                    Map<String, Object> ragInfo = node.getRagInfo() != null
                            ? new HashMap<>(node.getRagInfo()) : new HashMap<>();
                    ragInfo.put("status", "PENDING");
                    node.setRagInfo(ragInfo);
                }

                node.setUpdatedAt(now);
                nodeRepository.save(node);
            } else if (TYPE_ADD.equals(contribute.getType())) {
                if (req.nav_id() == null || req.nav_id().isBlank()) {
                    return error(HttpStatus.BAD_REQUEST.value(), "新增文档必须指定 nav_id");
                }
                if (navRepository.findById(req.nav_id()).isEmpty()) {
                    return error(HttpStatus.NOT_FOUND.value(), "目录不存在");
                }

                Node node = new Node();
                node.setId(UUID.randomUUID().toString());
                node.setKbId(req.kb_id());
                node.setNavId(req.nav_id());
                node.setParentId(req.parent_id() != null && !req.parent_id().isBlank() ? req.parent_id() : null);
                node.setType((short) 2);
                node.setStatus((short) 1);
                node.setName(contribute.getName() != null && !contribute.getName().isBlank()
                        ? contribute.getName() : "未命名文档");
                node.setContent(contribute.getContent());

                Map<String, Object> meta = new HashMap<>();
                if (contribute.getMeta() != null) {
                    if (contribute.getMeta().get("content_type") != null) {
                        meta.put("content_type", contribute.getMeta().get("content_type"));
                    }
                    if (contribute.getMeta().get("emoji") != null) {
                        meta.put("emoji", contribute.getMeta().get("emoji"));
                    }
                }
                node.setMeta(meta);

                node.setPosition(req.position() != null ? req.position() : 0.0);
                Map<String, Object> permissions = new HashMap<>();
                permissions.put("answerable", "open");
                permissions.put("visitable", "open");
                permissions.put("visible", "open");
                node.setPermissions(permissions);

                Map<String, Object> ragInfo = new HashMap<>();
                ragInfo.put("status", "PENDING");
                node.setRagInfo(ragInfo);

                node.setCreatorId("");
                node.setEditorId("");
                node.setEditTime(now);
                node.setCreatedAt(now);
                node.setUpdatedAt(now);
                nodeRepository.save(node);
            } else {
                return error(HttpStatus.BAD_REQUEST.value(), "贡献类型错误");
            }
        }

        contribute.setStatus(req.status());
        contribute.setAuditUserId(auditUserId);
        contribute.setAuditTime(now);
        contribute.setUpdatedAt(now);
        contributeRepository.save(contribute);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", contribute.getId());
        data.put("status", contribute.getStatus());
        return success(data);
    }

    // ---------- 辅助方法 ----------

    private Map<String, Object> mapContributeToDetail(Contribute contribute) {
        AuthInfo authInfo = contribute.getAuthId() != null ? getAuthInfo(contribute.getAuthId()) : null;

        Map<String, Object> originalNode = null;
        if (TYPE_EDIT.equals(contribute.getType()) && contribute.getNodeId() != null && !contribute.getNodeId().isBlank()) {
            Optional<Node> nodeOpt = nodeRepository.findById(contribute.getNodeId());
            if (nodeOpt.isPresent()) {
                Node node = nodeOpt.get();
                originalNode = new LinkedHashMap<>();
                originalNode.put("id", node.getId());
                originalNode.put("name", node.getName());
                originalNode.put("content", node.getContent());
                originalNode.put("meta", node.getMeta());
            }
        }

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("id", contribute.getId());
        detail.put("kb_id", contribute.getKbId());
        detail.put("node_id", contribute.getNodeId());
        detail.put("node_name", contribute.getName());
        detail.put("content", contribute.getContent());
        detail.put("reason", contribute.getReason());
        detail.put("auth_id", contribute.getAuthId());
        detail.put("auth_name", authInfo != null && authInfo.username() != null ? authInfo.username() : "匿名用户");
        detail.put("avatar", authInfo != null ? authInfo.avatar() : null);
        detail.put("remote_ip", contribute.getRemoteIp());
        detail.put("ip_address", Map.of("country", "", "province", "", "city", ""));
        detail.put("status", contribute.getStatus());
        detail.put("type", contribute.getType());
        detail.put("meta", contribute.getMeta());
        detail.put("original_node", originalNode);
        detail.put("audit_user_id", contribute.getAuditUserId() != null && !contribute.getAuditUserId().isBlank()
                ? contribute.getAuditUserId() : null);
        detail.put("audit_time", contribute.getAuditTime() != null ? contribute.getAuditTime().toString() : null);
        detail.put("created_at", contribute.getCreatedAt() != null ? contribute.getCreatedAt().toString() : null);
        detail.put("updated_at", contribute.getUpdatedAt() != null ? contribute.getUpdatedAt().toString() : null);
        return detail;
    }

    private Map<String, Object> mapRowToListItem(Map<String, Object> row) {
        Long authId = row.get("auth_id") instanceof Number n ? n.longValue() : null;
        AuthInfo authInfo = authId != null ? getAuthInfo(authId) : null;

        Object metaJson = row.get("meta");
        Map<String, Object> meta = null;
        try {
            if (metaJson instanceof String s) {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(s, Map.class);
                meta = parsed;
            } else if (metaJson instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> casted = (Map<String, Object>) m;
                meta = casted;
            }
        } catch (Exception ignored) {
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("id") != null ? row.get("id").toString() : null);
        item.put("kb_id", row.get("kb_id") != null ? row.get("kb_id").toString() : null);
        item.put("node_id", row.get("node_id") != null ? row.get("node_id").toString() : null);
        item.put("node_name", row.get("name") != null ? row.get("name").toString() : null);
        item.put("reason", row.get("reason") != null ? row.get("reason").toString() : null);
        item.put("auth_id", authId);
        item.put("auth_name", authInfo != null && authInfo.username() != null ? authInfo.username() : "匿名用户");
        item.put("avatar", authInfo != null ? authInfo.avatar() : null);
        item.put("remote_ip", row.get("remote_ip") != null ? row.get("remote_ip").toString() : null);
        item.put("ip_address", Map.of("country", "", "province", "", "city", ""));
        item.put("status", row.get("status") != null ? row.get("status").toString() : null);
        item.put("type", row.get("type") != null ? row.get("type").toString() : null);
        item.put("meta", meta);
        item.put("created_at", row.get("created_at") != null ? row.get("created_at").toString() : null);
        item.put("updated_at", row.get("updated_at") != null ? row.get("updated_at").toString() : null);
        return item;
    }

    private AuthInfo getAuthInfo(Long authId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT user_info FROM auths WHERE id = ?", authId
            );
            if (rows.isEmpty()) return null;
            Object userInfo = rows.get(0).get("user_info");
            Map<String, Object> infoMap;
            if (userInfo instanceof String s) {
                @SuppressWarnings("unchecked")
                Map<String, Object> parsed = objectMapper.readValue(s, Map.class);
                infoMap = parsed;
            } else if (userInfo instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> casted = (Map<String, Object>) m;
                infoMap = casted;
            } else {
                return null;
            }
            String username = infoMap.get("username") != null ? infoMap.get("username").toString() : null;
            String avatar = infoMap.get("avatar") != null ? infoMap.get("avatar").toString() : null;
            return new AuthInfo(username, avatar);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> getWebAppSettings(String kbId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT settings FROM apps WHERE kb_id = ? AND type = ?",
                kbId, (short) 1
        );
        if (rows.isEmpty()) return null;
        String settingsJson = rows.get(0).get("settings") != null
                ? rows.get(0).get("settings").toString() : null;
        if (settingsJson == null) return null;
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(settingsJson, Map.class);
            return parsed;
        } catch (Exception e) {
            return null;
        }
    }

    private String resolveKbId(String header) {
        if (header != null && !header.isBlank()) return header;
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id FROM knowledge_bases ORDER BY created_at LIMIT 1"
        );
        if (rows.isEmpty()) return null;
        return rows.get(0).get("id") instanceof String s ? s : null;
    }

    private String extractClientIp(HttpServletRequest request) {
        List<String> headers = List.of("X-Forwarded-For", "X-Real-IP", "Proxy-Client-IP", "WL-Proxy-Client-IP");
        for (String h : headers) {
            String value = request.getHeader(h);
            if (value != null && !value.isBlank() && !"unknown".equalsIgnoreCase(value)) {
                return value.split(",")[0].trim();
            }
        }
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "unknown";
    }

    private Map<String, Object> success(Object data) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", data);
        return result;
    }

    private Map<String, Object> error(int code, String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", false);
        result.put("code", code);
        result.put("message", message);
        result.put("data", null);
        return result;
    }
}
