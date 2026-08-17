package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.dto.KnowledgeBaseDtos;
import com.chaitin.pandawiki.entity.KnowledgeBase;
import com.chaitin.pandawiki.repository.KnowledgeBaseRepository;
import com.chaitin.pandawiki.security.JwtService;
import com.chaitin.pandawiki.service.EmbeddingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
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
    private final JwtService jwtService;
    private final EmbeddingService embeddingService;

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
    public Map<String, Object> release(@RequestBody KnowledgeBaseDtos.ReleaseReq req) {
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

        // 2. 生成 release 记录
        String releaseId = UUID.randomUUID().toString();
        jdbcTemplate.update(
                "INSERT INTO kb_releases (id, kb_id, tag, message, created_at) VALUES (?, ?, ?, ?, ?)",
                releaseId, kbId, req.getTag(), req.getMessage() != null ? req.getMessage() : "", now);

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
    public Map<String, Object> releaseList(@RequestParam("kb_id") String kbId) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, kb_id, tag, message, created_at FROM kb_releases WHERE kb_id = ? ORDER BY created_at DESC",
                kbId);
        return Map.of("success", true, "code", 0, "message", "OK", "data", rows);
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
            return obj == null ? "{}" : objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String resolvePerm(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return "";
        }
        try {
            Claims claims = jwtService.parseBearer(authHeader);
            String role = jwtService.role(claims);
            return "admin".equals(role) ? "full_control" : "";
        } catch (Exception e) {
            return "";
        }
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
