package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.consts.CrawlerSource;
import com.chaitin.pandawiki.dto.*;
import com.chaitin.pandawiki.security.JwtService;
import com.chaitin.pandawiki.service.DocumentParseService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 文档导入接口（对齐前端 AddDocByType）。
 * 支持本地文件、URL 抓取、飞书文档三类来源。
 */
@RestController
@RequestMapping("/api/v1/crawler")
@RequiredArgsConstructor
public class CrawlerController {

    private final DocumentParseService documentParseService;
    private final JwtService jwtService;

    private final ScheduledExecutorService cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "crawler-task-cleaner");
        t.setDaemon(true);
        return t;
    });

    private final Map<String, TaskRecord> taskStore = new ConcurrentHashMap<>();
    private final Map<String, FeishuSetting> feishuSettingCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        // 每 10 分钟清理一次超过 30 分钟的任务
        cleaner.scheduleAtFixedRate(this::cleanupTasks, 10, 10, TimeUnit.MINUTES);
    }

    /**
     * 解析文档树/列表。
     */
    @PostMapping("/parse")
    public Map<String, Object> parse(@RequestBody ParseReq req,
                                     @RequestHeader(value = "Authorization", required = false) String authHeader,
                                     HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;
        if (req.getKbId() == null || req.getKbId().isBlank()) {
            return error("kb_id 不能为空");
        }

        CrawlerSource source;
        try {
            source = CrawlerSource.from(req.getCrawlerSource());
        } catch (IllegalArgumentException e) {
            return error("不支持的导入来源: " + req.getCrawlerSource());
        }

        String id = UUID.randomUUID().toString();
        DocsTree docs;
        try {
            docs = switch (source) {
                case FILE -> parseFile(req);
                case URL -> parseUrl(req, id);
                case FEISHU -> parseFeishu(req, id);
                case RSS, SITEMAP, NOTION, DINGTALK, EPUB, YUQUE, SIYUAN, MINDOC, WIKIJS, CONFLUENCE ->
                        throw new UnsupportedOperationException("暂不支持的导入来源: " + source.getValue());
            };
        } catch (Exception e) {
            return error("解析失败: " + e.getMessage());
        }

        ParseResp resp = new ParseResp();
        resp.setId(id);
        resp.setDocs(docs);
        return ok(resp);
    }

    /**
     * 导出单个文档内容，返回 task_id 供轮询。
     */
    @PostMapping("/export")
    public Map<String, Object> export(@RequestBody ExportReq req,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader,
                                      HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;
        if (req.getDocId() == null || req.getDocId().isBlank()) {
            return error("doc_id 不能为空");
        }

        String taskId = UUID.randomUUID().toString();
        taskStore.put(taskId, new TaskRecord(taskId, "pending", null, Instant.now()));

        // 同步完成或异步执行；目前文件/URL/飞书均直接同步完成，再写入任务存储。
        try {
            String content = doExport(req);
            taskStore.put(taskId, new TaskRecord(taskId, "completed", content, Instant.now()));
        } catch (Exception e) {
            taskStore.put(taskId, new TaskRecord(taskId, "failed", e.getMessage(), Instant.now()));
        }

        ExportResp resp = new ExportResp();
        resp.setTaskId(taskId);
        return ok(resp);
    }

    /**
     * 查询单个任务结果（前端使用 GET）。
     */
    @GetMapping("/result")
    public Map<String, Object> result(@RequestParam("task_id") String taskId,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader,
                                      HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;
        TaskRecord record = taskStore.get(taskId);
        ResultResp resp = new ResultResp();
        if (record == null) {
            resp.setStatus("failed");
            resp.setContent("任务不存在");
        } else {
            resp.setStatus(record.status);
            resp.setContent(record.content);
        }
        return ok(resp);
    }

    /**
     * 批量查询任务结果。
     */
    @PostMapping("/results")
    public Map<String, Object> results(@RequestBody ResultsReq req,
                                       @RequestHeader(value = "Authorization", required = false) String authHeader,
                                       HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;
        if (req.getTaskIds() == null || req.getTaskIds().isEmpty()) {
            return error("task_ids 不能为空");
        }

        List<ResultItem> list = new ArrayList<>();
        String overallStatus = "completed";
        for (String taskId : req.getTaskIds()) {
            TaskRecord record = taskStore.get(taskId);
            ResultItem item = new ResultItem();
            item.setTaskId(taskId);
            if (record == null) {
                item.setStatus("failed");
                item.setContent("任务不存在");
            } else {
                item.setStatus(record.status);
                item.setContent(record.content);
                if (!"completed".equals(record.status)) {
                    overallStatus = record.status;
                }
            }
            list.add(item);
        }

        ResultsResp resp = new ResultsResp();
        resp.setStatus(overallStatus);
        resp.setList(list);
        return ok(resp);
    }

    // ---------- 内部分发 ----------

    private DocsTree parseFile(ParseReq req) {
        String key = req.getKey();
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("文件 key 不能为空");
        }
        // 预解析以获取摘要（前 200 字）
        String content = documentParseService.parseLocalFile(key);
        String summary = content.length() > 200 ? content.substring(0, 200) + "..." : content;
        String ext = key.substring(key.lastIndexOf('.') + 1).toLowerCase();
        DocValue value = new DocValue(
                key,
                req.getFilename() != null ? req.getFilename() : key,
                summary,
                ext,
                true
        );
        return new DocsTree(value, Collections.emptyList());
    }

    private DocsTree parseUrl(ParseReq req, String id) {
        String url = req.getKey();
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL 不能为空");
        }
        var result = documentParseService.parseUrl(url);
        String title = result.getFirst();
        String content = result.getSecond();
        String summary = content.length() > 200 ? content.substring(0, 200) + "..." : content;
        DocValue value = new DocValue(
                url,
                title,
                summary,
                "html",
                true
        );
        return new DocsTree(value, Collections.emptyList());
    }

    private DocsTree parseFeishu(ParseReq req, String id) {
        FeishuSetting setting = req.getFeishuSetting();
        if (setting == null || setting.getAppId() == null || setting.getAppSecret() == null || setting.getUserAccessToken() == null) {
            throw new IllegalArgumentException("飞书设置不完整");
        }
        feishuSettingCache.put(id, setting);
        return documentParseService.listFeishuDocs(setting);
    }

    private String doExport(ExportReq req) {
        // 优先判断是否为飞书：parse 阶段已缓存 setting
        FeishuSetting setting = feishuSettingCache.get(req.getId());
        if (setting != null) {
            return documentParseService.exportFeishuDoc(setting, req.getDocId(), req.getFileType());
        }

        // 文件或 URL
        String keyOrUrl = req.getDocId();
        if (keyOrUrl.startsWith("http://") || keyOrUrl.startsWith("https://")) {
            return documentParseService.parseUrl(keyOrUrl).getSecond();
        }
        return documentParseService.parseLocalFile(keyOrUrl);
    }

    // ---------- 工具方法 ----------

    private boolean requireLogin(String authHeader, HttpServletResponse response) {
        try {
            jwtService.parseBearer(authHeader);
            return true;
        } catch (Exception e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return false;
        }
    }

    private Map<String, Object> ok(Object data) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("code", 0);
        result.put("message", "OK");
        result.put("data", data);
        return result;
    }

    private Map<String, Object> error(String message) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", false);
        result.put("code", 40000);
        result.put("message", message);
        return result;
    }

    private void cleanupTasks() {
        Instant expireBefore = Instant.now().minusSeconds(30 * 60);
        taskStore.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(expireBefore));
        feishuSettingCache.entrySet().removeIf(entry -> {
            // setting 缓存用创建时间记录，保留 30 分钟
            TaskRecord record = taskStore.get(entry.getKey());
            Instant created = record != null ? record.createdAt() : Instant.now();
            return created.isBefore(expireBefore);
        });
    }

    private record TaskRecord(String taskId, String status, String content, Instant createdAt) {
    }
}
