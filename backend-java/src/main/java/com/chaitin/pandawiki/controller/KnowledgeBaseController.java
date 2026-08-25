package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.dto.KnowledgeBaseDtos;
import com.chaitin.pandawiki.entity.KnowledgeBase;
import com.chaitin.pandawiki.repository.KnowledgeBaseRepository;
import com.chaitin.pandawiki.security.KbAccessService;
import com.chaitin.pandawiki.service.EmbeddingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/knowledge_base")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final EmbeddingService embeddingService;
    private final KbAccessService kbAccessService;

    @PostMapping
    public KnowledgeBaseDtos.Resp create(@RequestBody KnowledgeBaseDtos.CreateReq req, HttpServletRequest request) {
        OffsetDateTime now = OffsetDateTime.now();
        KnowledgeBase kb = new KnowledgeBase();
        kb.setId(UUID.randomUUID().toString());
        kb.setName(req.getName());

        Map<String, Object> settings = new HashMap<>();
        settings.put("hosts", req.getHosts());
        settings.put("ports", req.getPorts());
        settings.put("ssl_ports", req.getSsl_ports());
        settings.put("public_key", req.getPublic_key());
        settings.put("private_key", req.getPrivate_key());
        kb.setAccessSettings(settings);

        kb.setCreatedAt(now);
        kb.setUpdatedAt(now);
        KnowledgeBase saved = knowledgeBaseRepository.save(kb);
        return toResp(saved, request);
    }

    @GetMapping("/list")
    public List<KnowledgeBaseDtos.Resp> list(HttpServletRequest request) {
        return knowledgeBaseRepository.findAll().stream()
                .map(kb -> toResp(kb, request))
                .collect(Collectors.toList());
    }

    @GetMapping("/detail")
    public KnowledgeBaseDtos.Resp detail(@RequestParam String id, HttpServletRequest request) {
        KnowledgeBase kb = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("knowledge base not found"));
        return toResp(kb, request);
    }

    @PutMapping("/detail")
    public KnowledgeBaseDtos.Resp update(@RequestBody KnowledgeBaseDtos.UpdateReq req, HttpServletRequest request) {
        KnowledgeBase kb = knowledgeBaseRepository.findById(req.getId())
                .orElseThrow(() -> new IllegalArgumentException("knowledge base not found"));
        if (req.getName() != null) {
            kb.setName(req.getName());
        }
        if (req.getAccess_settings() != null) {
            kb.setAccessSettings(req.getAccess_settings());
        }
        kb.setUpdatedAt(OffsetDateTime.now());
        KnowledgeBase saved = knowledgeBaseRepository.save(kb);
        return toResp(saved, request);
    }

    @DeleteMapping("/detail")
    public Map<String, String> delete(@RequestParam String id) {
        knowledgeBaseRepository.deleteById(id);
        return Map.of("message", "删除成功");
    }

    @PostMapping("/release")
    public Map<String, Object> release(@RequestBody KnowledgeBaseDtos.ReleaseReq req, HttpServletRequest request) {
        String kbId = req.getKb_id();
        if (kbId == null || kbId.isBlank()) {
            throw new IllegalArgumentException("kb_id is required");
        }
        knowledgeBaseRepository.findById(kbId)
                .orElseThrow(() -> new IllegalArgumentException("knowledge base not found"));

        OffsetDateTime now = OffsetDateTime.now();

        // 1. 确定要发布的节点：前端传了 node_ids 就用，否则发布该知识库所有未发布/更新未发布的节点
        List<String> nodeIds = req.getNode_ids();
        List<Map<String, Object>> nodes;
        if (nodeIds != null && !nodeIds.isEmpty()) {
            String inSql = nodeIds.stream().map(s -> "?").collect(Collectors.joining(","));
            nodes = jdbcTemplate.queryForList(
                    "SELECT * FROM nodes WHERE kb_id = ? AND id IN (" + inSql + ")",
                    prep(kbId, nodeIds));
        } else {
            nodes = jdbcTemplate.queryForList(
                    "SELECT * FROM nodes WHERE kb_id = ? AND status IN (0, 1)",
                    kbId);
        }

        if (nodes.isEmpty()) {
            return Map.of("success", true, "code", 0, "message", "OK", "data", Map.of("released", 0));
        }

        // 2. 生成 release 记录（记录发布者，来自 JWT/API Token 上下文，可为空）
        String releaseId = UUID.randomUUID().toString();
        String publisherId = kbAccessService.currentUserId(request);
        if (publisherId == null) publisherId = "";
        jdbcTemplate.update(
                "INSERT INTO kb_releases (id, kb_id, tag, message, publisher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                releaseId, kbId, req.getTag(), req.getMessage() != null ? req.getMessage() : "", publisherId, now);

        int releasedCount = 0;
        for (Map<String, Object> node : nodes) {
            String nodeId = (String) node.get("id");
            String nodeReleaseId = UUID.randomUUID().toString();

            // 3. 写入 node_releases 快照
            jdbcTemplate.update(
                    "INSERT INTO node_releases (id, kb_id, node_id, doc_id, type, visibility, name, meta, content, parent_id, position, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)",
                    nodeReleaseId, kbId, nodeId,
                    node.get("doc_id") != null ? node.get("doc_id") : "",
                    node.get("type"),
                    node.get("visibility") != null ? node.get("visibility") : 1,
                    node.get("name"),
                    toJson(node.get("meta")),
                    node.get("content"),
                    node.get("parent_id"),
                    node.get("position") != null ? node.get("position") : 0.0,
                    now);

            // 4. 关联 kb_release ↔ node_release
            jdbcTemplate.update(
                    "INSERT INTO kb_release_node_releases (id, kb_id, release_id, node_id, node_release_id, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?)",
                    UUID.randomUUID().toString(), kbId, releaseId, nodeId, nodeReleaseId, now);

            // 5. 把 nodes 表状态改为已发布
            jdbcTemplate.update(
                    "UPDATE nodes SET status = 2, updated_at = ? WHERE id = ?",
                    now, nodeId);
            releasedCount++;
        }

        // 6. 发布后自动触发增量向量化（失败不阻塞发布流程）
        try {
            embeddingService.ensureIndexed(kbId);
        } catch (Exception e) {
            // 向量化失败时保留发布结果，前端仍显示"未学习"可手动重试
            System.err.println("[WARN] 发布知识库后向量化失败: " + e.getMessage());
        }

        Map<String, Object> data = new HashMap<>();
        data.put("release_id", releaseId);
        data.put("released", releasedCount);
        return Map.of("success", true, "code", 0, "message", "OK", "data", data);
    }

    @GetMapping("/release/list")
    public Map<String, Object> releaseList(@RequestParam("kb_id") String kbId,
                                           @RequestParam(name = "page", required = false) Integer page,
                                           @RequestParam(name = "per_page", required = false) Integer perPage) {
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (perPage == null || perPage < 1) ? 20 : perPage;
        int offset = (p - 1) * ps;

        Long total = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM kb_releases WHERE kb_id = ?", Long.class, kbId);

        // 联表 users 取发布者账号；第一条即当前版本（按创建时间倒序）
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT r.id, r.kb_id, r.tag, r.message, r.created_at, u.account AS publisher_account " +
                        "FROM kb_releases r LEFT JOIN users u ON u.id = r.publisher_id " +
                        "WHERE r.kb_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?",
                kbId, ps, offset);

        Map<String, Object> data = new HashMap<>();
        data.put("list", rows);
        data.put("total", total != null ? total : 0L);
        return Map.of("success", true, "code", 0, "message", "OK", "data", data);
    }

    /**
     * 版本回滚：用指定 release 的节点快照覆盖 nodes 当前内容，并重建向量。
     */
    @PostMapping("/release/rollback")
    public Map<String, Object> releaseRollback(@RequestBody Map<String, String> body) {
        String kbId = body.get("kb_id");
        String releaseId = body.get("release_id");
        if (kbId == null || kbId.isBlank()) {
            throw new IllegalArgumentException("kb_id is required");
        }
        if (releaseId == null || releaseId.isBlank()) {
            throw new IllegalArgumentException("release_id is required");
        }
        knowledgeBaseRepository.findById(kbId)
                .orElseThrow(() -> new IllegalArgumentException("knowledge base not found"));

        List<Map<String, Object>> releaseRows = jdbcTemplate.queryForList(
                "SELECT id FROM kb_releases WHERE id = ? AND kb_id = ?", releaseId, kbId);
        if (releaseRows.isEmpty()) {
            throw new IllegalArgumentException("release not found");
        }

        // 查出该版本的所有节点快照
        List<Map<String, Object>> snapshots = jdbcTemplate.queryForList(
                "SELECT nr.node_id, nr.name, nr.meta, nr.content, nr.visibility, nr.type, nr.parent_id, nr.position " +
                        "FROM node_releases nr " +
                        "JOIN kb_release_node_releases krn ON krn.node_release_id = nr.id " +
                        "WHERE krn.release_id = ? AND krn.kb_id = ?",
                releaseId, kbId);

        OffsetDateTime now = OffsetDateTime.now();
        int rolledBack = 0;
        for (Map<String, Object> snap : snapshots) {
            String nodeId = (String) snap.get("node_id");
            if (nodeId == null) continue;
            int updated = jdbcTemplate.update(
                    "UPDATE nodes SET name = ?, meta = ?::jsonb, content = ?, visibility = ?, type = ?, " +
                            "parent_id = ?, position = ?, status = 2, updated_at = ? WHERE id = ? AND kb_id = ?",
                    snap.get("name"),
                    toJson(snap.get("meta")),
                    snap.get("content"),
                    snap.get("visibility") != null ? snap.get("visibility") : 1,
                    snap.get("type"),
                    snap.get("parent_id"),
                    snap.get("position") != null ? snap.get("position") : 0.0,
                    now,
                    nodeId, kbId);
            if (updated > 0) rolledBack++;
        }

        // 回滚后清空并重建该知识库向量（失败不阻塞）
        try {
            jdbcTemplate.update("DELETE FROM node_embeddings WHERE kb_id = ?", kbId);
            embeddingService.ensureIndexed(kbId);
        } catch (Exception e) {
            System.err.println("[WARN] 回滚后向量化失败: " + e.getMessage());
        }

        Map<String, Object> data = new HashMap<>();
        data.put("release_id", releaseId);
        data.put("rolled_back", rolledBack);
        return Map.of("success", true, "code", 0, "message", "OK", "data", data);
    }

    /**
     * 删除历史版本（仅限非当前版本），级联清理节点快照。
     */
    @DeleteMapping("/release")
    public Map<String, Object> releaseDelete(@RequestParam("kb_id") String kbId,
                                             @RequestParam("release_id") String releaseId) {
        if (kbId == null || kbId.isBlank()) {
            throw new IllegalArgumentException("kb_id is required");
        }
        if (releaseId == null || releaseId.isBlank()) {
            throw new IllegalArgumentException("release_id is required");
        }

        // 当前版本 = 最新一条，不允许删除（避免破坏快照完整性）
        List<Map<String, Object>> latest = jdbcTemplate.queryForList(
                "SELECT id FROM kb_releases WHERE kb_id = ? ORDER BY created_at DESC LIMIT 1", kbId);
        if (latest.isEmpty()) {
            throw new IllegalArgumentException("release not found");
        }
        if (latest.get(0).get("id").equals(releaseId)) {
            throw new IllegalArgumentException("当前版本不能删除，请先发布新版本");
        }

        List<Map<String, Object>> target = jdbcTemplate.queryForList(
                "SELECT id FROM kb_releases WHERE id = ? AND kb_id = ?", releaseId, kbId);
        if (target.isEmpty()) {
            throw new IllegalArgumentException("release not found");
        }

        // 级联删除：先删 node_releases（按本版本的 node_release_id），再删关联表、发布记录
        List<Map<String, Object>> links = jdbcTemplate.queryForList(
                "SELECT node_release_id FROM kb_release_node_releases WHERE release_id = ?", releaseId);
        if (!links.isEmpty()) {
            List<String> nrIds = links.stream()
                    .map(m -> String.valueOf(m.get("node_release_id")))
                    .collect(Collectors.toList());
            String inSql = nrIds.stream().map(s -> "?").collect(Collectors.joining(","));
            jdbcTemplate.update(
                    "DELETE FROM node_releases WHERE kb_id = ? AND id IN (" + inSql + ")",
                    prep(kbId, nrIds));
        }
        jdbcTemplate.update("DELETE FROM kb_release_node_releases WHERE release_id = ?", releaseId);
        jdbcTemplate.update("DELETE FROM kb_releases WHERE id = ? AND kb_id = ?", releaseId, kbId);

        return Map.of("success", true, "code", 0, "message", "OK", "data", Map.of("deleted", releaseId));
    }

    private Object[] prep(Object first, List<?> rest) {
        Object[] arr = new Object[rest.size() + 1];
        arr[0] = first;
        for (int i = 0; i < rest.size(); i++) {
            arr[i + 1] = rest.get(i);
        }
        return arr;
    }

    private String toJson(Object obj) {
        try {
            if (obj == null) return "{}";
            // PostgreSQL jsonb 字段经 JdbcTemplate 读出的是 PGobject，需取其内部 JSON 字符串
            if (obj instanceof org.postgresql.util.PGobject pg) {
                return pg.getValue() != null ? pg.getValue() : "{}";
            }
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String resolvePerm(HttpServletRequest request) {
        // 复用访问控制帮助类：带 kb_id（如 detail?id=）时精确解析 kb_users / api_tokens 权限
        String kbId = request.getParameter("id");
        if (kbId != null && !kbId.isBlank()) {
            return kbAccessService.resolvePerm(request, kbId);
        }
        // 无 kb_id（如 list）：admin 直通 full_control，API Token 按上下文权限返回
        String type = (String) request.getAttribute(KbAccessService.ATTR_TYPE);
        if ("admin".equals(request.getAttribute(KbAccessService.ATTR_ROLE))) return "full_control";
        if ("token".equals(type)) return String.valueOf(request.getAttribute(KbAccessService.ATTR_PERM));
        return "";
    }

    private KnowledgeBaseDtos.Resp toResp(KnowledgeBase kb, HttpServletRequest request) {
        KnowledgeBaseDtos.Resp resp = new KnowledgeBaseDtos.Resp();
        resp.setId(kb.getId());
        resp.setName(kb.getName());
        resp.setAccess_settings(kb.getAccessSettings());
        resp.setPerm(resolvePerm(request));
        resp.setCreated_at(kb.getCreatedAt());
        resp.setUpdated_at(kb.getUpdatedAt());
        return resp;
    }
}
