package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.dto.NodeDtos;
import com.chaitin.pandawiki.entity.Nav;
import com.chaitin.pandawiki.entity.Node;
import com.chaitin.pandawiki.repository.NavRepository;
import com.chaitin.pandawiki.repository.NodeRepository;
import com.chaitin.pandawiki.service.EmbeddingService;
import com.chaitin.pandawiki.service.ModelService;
import com.chaitin.pandawiki.service.PromptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/node")
@RequiredArgsConstructor
public class NodeController {

    private final NodeRepository nodeRepository;
    private final NavRepository navRepository;
    private final JdbcTemplate jdbcTemplate;
    private final ModelService modelService;
    private final PromptService promptService;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    @PostMapping
    public Node create(@RequestBody NodeDtos.CreateReq req) {
        OffsetDateTime now = OffsetDateTime.now();
        Node node = new Node();
        node.setId(UUID.randomUUID().toString());
        node.setKbId(req.getKb_id());
        node.setNavId(req.getNav_id());
        node.setParentId(req.getParent_id());
        node.setType(req.getType());
        node.setName(req.getName());
        node.setContent(req.getContent());
        node.setStatus((short) 1);

        Map<String, Object> meta = new HashMap<>();
        if (req.getSummary() != null) {
            meta.put("summary", req.getSummary());
        }
        if (req.getEmoji() != null) {
            meta.put("emoji", req.getEmoji());
        }
        if (req.getContent_type() != null) {
            meta.put("content_type", req.getContent_type());
        }
        node.setMeta(meta);

        node.setPosition(req.getPosition() != null ? req.getPosition() : 0.0);
        node.setPermissions(new HashMap<>(Map.of(
                "answerable", "open",
                "visitable", "open",
                "visible", "open")));
        node.setRagInfo(new HashMap<>());
        node.setCreatorId("");
        node.setEditorId("");
        node.setEditTime(now);
        node.setCreatedAt(now);
        node.setUpdatedAt(now);
        return nodeRepository.save(node);
    }

    @GetMapping("/list")
    public List<Node> list(@RequestParam("kb_id") String kbId,
                           @RequestParam(name = "nav_id", required = false) String navId) {
        if (navId != null && !navId.isEmpty()) {
            return nodeRepository.findByKbIdAndNavId(kbId, navId);
        }
        return nodeRepository.findByKbId(kbId);
    }

    @GetMapping({"/list/group/nav", "/list_group_nav"})
    public List<NodeDtos.GroupNavResp> listGroupNav(
            @RequestParam("kb_id") String kbId,
            @RequestParam(name = "status", required = false) String status) {
        List<Nav> navs = navRepository.findByKbIdOrderByPositionAsc(kbId);
        List<Node> nodes = nodeRepository.findByKbId(kbId);

        // status=unstudied 时只返回已发布但尚未向量化的文档
        if ("unstudied".equalsIgnoreCase(status)) {
            List<String> indexedIds = jdbcTemplate.query(
                    "SELECT DISTINCT node_id FROM node_embeddings WHERE kb_id = ?",
                    (rs, rowNum) -> rs.getString("node_id"),
                    kbId
            );
            Set<String> indexedSet = new HashSet<>(indexedIds);
            nodes = nodes.stream()
                    .filter(n -> n.getType() != null && n.getType() == 2)
                    .filter(n -> n.getStatus() != null && n.getStatus() == 2)
                    .filter(n -> !indexedSet.contains(n.getId()))
                    .collect(Collectors.toList());
        }

        Map<String, List<Node>> byNav = nodes.stream()
                .collect(Collectors.groupingBy(n -> n.getNavId() != null ? n.getNavId() : ""));

        List<NodeDtos.GroupNavResp> result = new ArrayList<>();
        for (Nav nav : navs) {
            NodeDtos.GroupNavResp group = new NodeDtos.GroupNavResp();
            group.setNav_id(nav.getId());
            group.setNav_name(nav.getName());
            group.setPosition(nav.getPosition());
            List<Node> list = byNav.getOrDefault(nav.getId(), Collections.emptyList());
            group.setList(list);
            group.setCount((long) list.size());
            result.add(group);
        }

        List<Node> orphanNodes = byNav.getOrDefault("", Collections.emptyList());
        if (!orphanNodes.isEmpty()) {
            NodeDtos.GroupNavResp group = new NodeDtos.GroupNavResp();
            group.setNav_id("");
            group.setNav_name("");
            group.setPosition(0.0);
            group.setList(orphanNodes);
            group.setCount((long) orphanNodes.size());
            result.add(group);
        }
        return result;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@RequestParam("kb_id") String kbId) {
        // 未发布文档/文件夹数：草稿(0) + 更新未发布(1)
        Long unpublished = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM nodes WHERE kb_id = ? AND status IN (0, 1)",
                Long.class, kbId);
        // 未学习文档数：已发布文档(type=2, status=2) 但尚未写入 node_embeddings
        Long unstudied = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM nodes n "
                        + "WHERE n.kb_id = ? AND n.type = 2 AND n.status = 2 "
                        + "AND NOT EXISTS (SELECT 1 FROM node_embeddings e WHERE e.node_id = n.id)",
                Long.class, kbId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("unpublished_count", unpublished != null ? unpublished : 0L);
        result.put("unreleased_nav_count", 0L);
        result.put("unstudied_count", unstudied != null ? unstudied : 0L);
        return result;
    }

    @GetMapping("/detail")
    public Node detail(@RequestParam("id") String id) {
        return nodeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("node not found"));
    }

    @PutMapping({"", "/detail"})
    public Node update(@RequestBody NodeDtos.UpdateReq req) {
        Node node = nodeRepository.findById(req.getId())
                .orElseThrow(() -> new IllegalArgumentException("node not found"));
        if (req.getName() != null) {
            node.setName(req.getName());
        }
        if (req.getContent() != null) {
            node.setContent(req.getContent());
            // 已发布文档内容变更后，删除旧向量，让它重新进入未学习状态
            if (node.getStatus() != null && node.getStatus() == 2
                    && node.getType() != null && node.getType() == 2) {
                jdbcTemplate.update("DELETE FROM node_embeddings WHERE node_id = ?", node.getId());
                Map<String, Object> ragInfo = node.getRagInfo();
                if (ragInfo == null) {
                    ragInfo = new HashMap<>();
                } else {
                    ragInfo = new HashMap<>(ragInfo);
                }
                ragInfo.put("status", "PENDING");
                node.setRagInfo(ragInfo);
            }
        }
        if (req.getNav_id() != null) {
            node.setNavId(req.getNav_id());
        }
        if (req.getPosition() != null) {
            node.setPosition(req.getPosition());
        }

        Map<String, Object> meta = node.getMeta();
        if (meta == null) {
            meta = new HashMap<>();
        } else {
            meta = new HashMap<>(meta);
        }
        if (req.getSummary() != null) {
            meta.put("summary", req.getSummary());
        }
        if (req.getEmoji() != null) {
            meta.put("emoji", req.getEmoji());
        }
        if (req.getContent_type() != null) {
            meta.put("content_type", req.getContent_type());
        }
        node.setMeta(meta);

        node.setUpdatedAt(OffsetDateTime.now());
        return nodeRepository.save(node);
    }

    @DeleteMapping({"", "/detail"})
    public Map<String, String> delete(@RequestParam("ids") List<String> ids) {
        nodeRepository.deleteAllById(ids);
        return Map.of("message", "删除成功");
    }

    @PostMapping("/action")
    public Map<String, String> action(@RequestBody NodeDtos.ActionReq req) {
        if ("delete".equalsIgnoreCase(req.getAction()) && req.getIds() != null) {
            nodeRepository.deleteAllById(req.getIds());
        }
        return Map.of("message", "操作成功");
    }

    /**
     * 移动节点：支持同层级排序（prev_id / next_id）和变更父节点（parent_id）。
     */
    @PostMapping("/move")
    public Map<String, Object> move(@RequestBody NodeDtos.MoveReq req) {
        Node node = nodeRepository.findById(req.getId())
                .orElseThrow(() -> new IllegalArgumentException("node not found"));

        if (!Objects.equals(node.getKbId(), req.getKb_id())) {
            throw new IllegalArgumentException("节点不属于该知识库");
        }

        if (req.getParent_id() != null) {
            node.setParentId(req.getParent_id().isBlank() ? null : req.getParent_id());
        }

        double newPosition = computePosition(req.getKb_id(), req.getParent_id(), req.getPrev_id(), req.getNext_id());
        node.setPosition(newPosition);
        node.setUpdatedAt(OffsetDateTime.now());
        nodeRepository.save(node);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", Map.of("id", node.getId(), "position", node.getPosition()));
        return result;
    }

    /**
     * 把节点移动到指定导航下（知识库内换分组）。
     */
    @PostMapping("/move/nav")
    public Map<String, Object> moveNav(@RequestBody NodeDtos.MoveNavReq req) {
        if (req.getIds() == null || req.getIds().isEmpty()) {
            throw new IllegalArgumentException("ids 不能为空");
        }
        List<Node> nodes = nodeRepository.findAllById(req.getIds());
        for (Node node : nodes) {
            if (!Objects.equals(node.getKbId(), req.getKb_id())) {
                throw new IllegalArgumentException("节点不属于该知识库");
            }
            node.setNavId(req.getNav_id());
            node.setUpdatedAt(OffsetDateTime.now());
        }
        nodeRepository.saveAll(nodes);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", Map.of("updated", nodes.size()));
        return result;
    }

    /**
     * 文档重新学习：删除指定文档的向量并重新生成，用于 Admin "去学习" 功能。
     */
    @PostMapping("/restudy")
    public Map<String, Object> restudy(@RequestBody NodeDtos.RestudyReq req) {
        if (req.getNode_ids() == null || req.getNode_ids().isEmpty()) {
            throw new IllegalArgumentException("node_ids 不能为空");
        }
        if (req.getKb_id() == null || req.getKb_id().isBlank()) {
            throw new IllegalArgumentException("kb_id 不能为空");
        }

        int count = embeddingService.restudyNodes(req.getKb_id(), req.getNode_ids());

        // 更新 rag_info 状态为 succeeded
        List<Node> nodes = nodeRepository.findAllById(req.getNode_ids());
        for (Node node : nodes) {
            if (!Objects.equals(node.getKbId(), req.getKb_id())) continue;
            Map<String, Object> ragInfo = node.getRagInfo();
            if (ragInfo == null) ragInfo = new HashMap<>();
            else ragInfo = new HashMap<>(ragInfo);
            ragInfo.put("status", "SUCCEEDED");
            node.setRagInfo(ragInfo);
            node.setUpdatedAt(OffsetDateTime.now());
        }
        nodeRepository.saveAll(nodes);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", Map.of("restudied", count));
        return result;
    }

    /**
     * 根据 prev_id / next_id 计算新的 position，采用相邻节点取中值策略。
     */
    private double computePosition(String kbId, String parentId, String prevId, String nextId) {
        Double prevPos = null;
        Double nextPos = null;
        if (prevId != null && !prevId.isBlank()) {
            prevPos = nodeRepository.findById(prevId).map(Node::getPosition).orElse(null);
        }
        if (nextId != null && !nextId.isBlank()) {
            nextPos = nodeRepository.findById(nextId).map(Node::getPosition).orElse(null);
        }
        if (prevPos != null && nextPos != null) {
            return (prevPos + nextPos) / 2.0;
        }
        if (prevPos != null) {
            return prevPos + 1000.0;
        }
        if (nextPos != null) {
            return nextPos - 1000.0;
        }
        // 默认放到最后：取同 parent 下最大 position + 1000
        String effectiveParentId = (parentId == null || parentId.isBlank()) ? null : parentId;
        List<Node> siblings = nodeRepository.findByKbId(kbId).stream()
                .filter(n -> Objects.equals(n.getParentId(), effectiveParentId) && !Objects.equals(n.getId(), kbId))
                .toList();
        double max = siblings.stream().mapToDouble(Node::getPosition).max().orElse(0.0);
        return max + 1000.0;
    }

    @PostMapping("/summary")
    public Map<String, Object> summary(@RequestBody NodeDtos.SummaryReq req) {
        List<Node> nodes = nodeRepository.findAllById(req.getIds());
        for (Node node : nodes) {
            String content = node.getContent();
            if (content == null || content.isBlank()) continue;
            String summary = generateSummary(node.getKbId(), content);
            Map<String, Object> meta = node.getMeta();
            if (meta == null) meta = new HashMap<>();
            else meta = new HashMap<>(meta);
            meta.put("summary", summary);
            node.setMeta(meta);
            node.setUpdatedAt(OffsetDateTime.now());
            nodeRepository.save(node);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", Map.of("updated", nodes.size()));
        return result;
    }

    @PostMapping("/summary/stream")
    public SseEmitter summaryStream(@RequestBody NodeDtos.SummaryReq req) {
        SseEmitter emitter = new SseEmitter(60_000L);
        new Thread(() -> {
            try {
                List<Node> nodes = nodeRepository.findAllById(req.getIds());
                for (Node node : nodes) {
                    String content = node.getContent();
                    if (content == null || content.isBlank()) continue;
                    String summary = generateSummary(node.getKbId(), content);
                    Map<String, Object> event = new LinkedHashMap<>();
                    event.put("type", "data");
                    event.put("content", summary);
                    emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(event)));
                }
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }).start();
        return emitter;
    }

    /**
     * 生成摘要：优先使用 analysis 模型和知识库配置的摘要提示词，未配置时降级到 chat 模型。
     */
    private String generateSummary(String kbId, String content) {
        String summaryPrompt = promptService.getSummaryPrompt(kbId);
        String prompt = summaryPrompt + "\n" + content;
        return modelService.chatByType(
            "analysis",
            List.of(Map.of("role", (Object) "user", "content", (Object) prompt)),
            2048,
            0.3,
            true
        );
    }
}
