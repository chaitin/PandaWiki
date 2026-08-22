package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.entity.Node;
import com.chaitin.pandawiki.repository.NavRepository;
import com.chaitin.pandawiki.repository.NodeRepository;
import com.chaitin.pandawiki.security.KbAccessService;
import com.chaitin.pandawiki.service.DocumentParseService;
import com.chaitin.pandawiki.service.EmbeddingService;
import com.chaitin.pandawiki.service.ModelService;
import com.chaitin.pandawiki.service.PromptService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.stream.Collectors;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * RAG 开放接口（3.5，对标 Go Pro 的 datasets / retrieval 最小实现）。
 * 供外部平台拿 API Token 直接「喂文档 + 问答检索」，形成完整接入闭环：
 * - POST /api/v1/rag/documents   上传文档并向量化（复用 DocumentParseService + EmbeddingService）
 * - POST /api/v1/rag/retrieval   语义检索 top-K，返回相关文本片段
 *
 * 鉴权走 3.4：Authorization: Bearer <API Token>（也兼容登录用户 JWT）。
 * documents 需 doc_manage / full_control；retrieval 需任意有效权限。
 */
@RestController
@RequestMapping("/api/v1/rag")
@RequiredArgsConstructor
public class RagController {

    private static final Set<String> DENIED_EXT = Set.of(
            "exe", "sh", "bat", "cmd", "ps1", "jar", "dll", "php", "jsp", "asp", "aspx", "msi", "vbs");

    private static final double SIMILARITY_THRESHOLD = 0.5;

    private final NodeRepository nodeRepository;
    private final NavRepository navRepository;
    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingService embeddingService;
    private final DocumentParseService documentParseService;
    private final KbAccessService kbAccessService;
    private final ModelService modelService;
    private final PromptService promptService;

    @Value("${panda.upload.dir:data/static}")
    private String uploadDir;

    record RetrievalReq(String kb_id, String query) {
    }

    /** 上传文档：解析 → 落库（status=2 已发布, type=2 文档）→ 向量化 */
    @PostMapping(value = "/documents", produces = MediaType.TEXT_PLAIN_VALUE)
    public String documents(@RequestParam("file") MultipartFile file,
                            @RequestParam("kb_id") String kbId,
                            HttpServletRequest request, HttpServletResponse response) {
        if (kbId == null || kbId.isBlank()) return plainError(response, 400, "kb_id 不能为空");
        // 喂文档属于「文档管理」级别操作
        if (kbAccessService.requirePerm(request, response, kbId,
                Set.of("full_control", "doc_manage")) == null) return null;
        if (file == null || file.isEmpty()) return plainError(response, 400, "file 不能为空");

        String originalName = file.getOriginalFilename() == null ? "unnamed" : file.getOriginalFilename();
        String ext = extOf(originalName);
        if (isDeniedExt(ext)) return plainError(response, 400, "文件扩展名 '" + ext + "' 不允许上传");

        // 1. 存盘
        String key = kbId + "/" + UUID.randomUUID() + ext;
        if (!saveMultipart(file, key)) {
            return plainError(response, 500, "文件写入失败");
        }

        // 2. 解析为 Markdown/文本
        String content;
        try {
            content = documentParseService.parseLocalFile(key);
        } catch (Exception e) {
            return plainError(response, 400, "文档解析失败: " + e.getMessage());
        }
        if (content == null || content.isBlank()) {
            return plainError(response, 400, "文档内容为空，无法学习");
        }

        // 3. 创建已发布文档节点（type=2, status=2，直接可检索）
        // 挂到该知识库第一个目录下，否则前端按目录分组时看不到
        String navId = navRepository.findByKbIdOrderByPositionAsc(kbId).stream()
                .findFirst().map(n -> n.getId()).orElse("");

        OffsetDateTime now = OffsetDateTime.now();
        Node node = new Node();
        node.setId(UUID.randomUUID().toString());
        node.setKbId(kbId);
        node.setNavId(navId);
        node.setType((short) 2);
        node.setStatus((short) 2);
        node.setName(originalName);
        node.setContent(content);
        node.setMeta(new HashMap<>(Map.of("content_type", ext)));
        node.setPermissions(new HashMap<>(Map.of(
                "answerable", "open", "visitable", "open", "visible", "open")));
        node.setRagInfo(new HashMap<>(Map.of("status", "SUCCEEDED")));
        node.setCreatorId(kbAccessService.currentUserId(request) != null
                ? kbAccessService.currentUserId(request) : "");
        node.setEditorId("");
        node.setPosition(0.0);
        node.setEditTime(now);
        node.setCreatedAt(now);
        node.setUpdatedAt(now);
        Node saved = nodeRepository.save(node);

        // 4. 向量化（懒加载增量索引，只给未向量化的新文档生成向量）
        try {
            embeddingService.ensureIndexed(kbId);
        } catch (Exception e) {
            // 向量化失败不阻塞返回，文档已入库可手动重试
            System.err.println("[WARN] RAG 喂文档后向量化失败: " + e.getMessage());
        }

        return "文档《" + saved.getName() + "》已存入";
    }

    /** 问答检索：语义相似度 top-K，embedding 不可用时降级关键词 ILIKE，最后调用 chat 模型只返回答案 */
    @PostMapping(value = "/retrieval", produces = MediaType.TEXT_PLAIN_VALUE)
    public String retrieval(@RequestBody RetrievalReq req,
                            HttpServletRequest request, HttpServletResponse response) {
        if (req.kb_id == null || req.kb_id.isBlank() || req.query == null || req.query.isBlank()) {
            return plainError(response, 400, "kb_id 和 query 不能为空");
        }
        // 检索属于「数据运营」级别：任意有效权限即可
        if (kbAccessService.requirePerm(request, response, req.kb_id,
                Set.of("full_control", "doc_manage", "data_operate")) == null) return null;

        List<Map<String, Object>> hits;
        try {
            embeddingService.ensureIndexed(req.kb_id);
            hits = embeddingService.search(req.kb_id, req.query.trim(), 10).stream()
                    .filter(hit -> hit.getScore() >= SIMILARITY_THRESHOLD)
                    .limit(5)
                    .map(this::toHit)
                    .toList();
        } catch (Exception e) {
            System.err.println("[DEBUG] 向量检索失败，降级为关键词检索: " + e.getMessage());
            hits = keywordSearch(req.kb_id, req.query.trim());
        }

        String context = buildContext(hits);
        String systemPrompt = buildSystemPrompt(req.kb_id, context);

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        messages.add(Map.of("role", "user", "content", req.query.trim()));

        try {
            return modelService.chat(messages);
        } catch (Exception e) {
            return plainError(response, 500, "回答生成失败: " + e.getMessage());
        }
    }

    // ---------- 内部方法 ----------

    private Map<String, Object> toHit(EmbeddingService.VectorHit hit) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("node_id", hit.getNodeId());
        item.put("name", hit.getName());
        item.put("content", hit.getContent());
        item.put("score", hit.getScore());
        return item;
    }

    /** 把检索结果拼成给模型的上下文 */
    private String buildContext(List<Map<String, Object>> hits) {
        if (hits == null || hits.isEmpty()) return "";
        return "以下是从知识库中检索到的相关内容：\n" +
                hits.stream()
                        .map(h -> "文档：" + h.get("name") + "\n" + h.get("content"))
                        .collect(Collectors.joining("\n---\n")) +
                "\n---\n请基于以上内容回答用户问题。如果内容与问题无关，请直接回答。";
    }

    /** 构造 system prompt：优先使用知识库 CardAI 提示词，再拼接检索上下文 */
    private String buildSystemPrompt(String kbId, String context) {
        String basePrompt;
        try {
            basePrompt = promptService.getPromptContent(kbId);
        } catch (Exception e) {
            basePrompt = "你是一个知识库问答助手。";
        }
        if (basePrompt == null || basePrompt.isBlank()) {
            basePrompt = "你是一个知识库问答助手。";
        }
        return context.isEmpty() ? basePrompt : basePrompt + "\n\n" + context;
    }

    /** 关键词检索（降级方案） */
    private List<Map<String, Object>> keywordSearch(String kbId, String keyword) {
        String like = "%" + keyword + "%";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, name, content FROM nodes "
                        + "WHERE kb_id = ? AND status = 2 AND type = 2 AND (name ILIKE ? OR content ILIKE ?) "
                        + "ORDER BY updated_at DESC NULLS LAST LIMIT 10",
                kbId, like, like);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("node_id", r.get("id"));
            item.put("name", r.get("name"));
            item.put("content", r.get("content"));
            item.put("score", 0.0);
            items.add(item);
        }
        return items;
    }

    private boolean saveMultipart(MultipartFile file, String key) {
        try {
            Path target = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(key).normalize();
            if (!target.startsWith(Paths.get(uploadDir).toAbsolutePath().normalize())) return false;
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private String extOf(String filename) {
        if (filename == null) return "";
        int idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx).toLowerCase() : "";
    }

    private boolean isDeniedExt(String ext) {
        String plain = ext.startsWith(".") ? ext.substring(1) : ext;
        return !plain.isEmpty() && DENIED_EXT.contains(plain);
    }

    private String plainError(HttpServletResponse response, int status, String message) {
        response.setStatus(status);
        response.setContentType("text/plain;charset=UTF-8");
        try {
            response.getWriter().write(message);
        } catch (Exception ignored) {
        }
        return null;
    }
}
