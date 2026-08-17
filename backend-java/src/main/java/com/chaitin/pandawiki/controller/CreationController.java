package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.service.ModelService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/creation")
@RequiredArgsConstructor
public class CreationController {

    private final ModelService modelService;

    @PostMapping("/tab-complete")
    public String tabComplete(@RequestBody Map<String, String> req) {
        String prefix = req.getOrDefault("prefix", "");
        String suffix = req.getOrDefault("suffix", "");
        if (prefix.isBlank() && suffix.isBlank()) {
            return "";
        }
        String prompt;
        if (suffix.isBlank()) {
            prompt = "请根据以下内容续写一段文字，保持主题一致，只输出续写内容，不要解释：\n" + prefix;
        } else {
            prompt = "请根据上下文补全中间内容，只输出补全内容，不要解释：\n前文：" + prefix + "\n后文：" + suffix;
        }
        return modelService.chat(List.of(Map.of("role", (Object) "user", "content", (Object) prompt)));
    }

    @PostMapping("/text")
    public void text(@RequestBody Map<String, Object> req, HttpServletResponse response) throws IOException {
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        String text = (String) req.getOrDefault("text", "");
        String action = (String) req.getOrDefault("action", "rephrase");
        if (text == null || text.isBlank()) {
            return;
        }

        String prompt;
        switch (action) {
            case "summary":
                prompt = "请对以下文字进行摘要，保留核心信息，只输出摘要内容，不要解释：\n" + text;
                break;
            case "extend":
                prompt = "请根据以下内容扩展细节，保持主题一致，只输出扩展后的内容，不要解释：\n" + text;
                break;
            case "shorten":
                prompt = "请缩短以下文字，保留核心信息，只输出缩短后的内容，不要解释：\n" + text;
                break;
            case "rephrase":
            default:
                prompt = "请润色以下文字，使其表达更通顺、专业，只输出润色后的内容，不要解释：\n" + text;
                break;
        }

        String result = modelService.chat(List.of(Map.of("role", (Object) "user", "content", (Object) prompt)));

        PrintWriter writer = response.getWriter();
        int chunkSize = 8;
        for (int i = 0; i < result.length(); i += chunkSize) {
            int end = Math.min(i + chunkSize, result.length());
            writer.write(result, i, end - i);
            writer.flush();
            try {
                Thread.sleep(40);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}
