package com.chaitin.pandawiki.controller;

import com.chaitin.pandawiki.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

/**
 * 文件上传接口（对齐 Go 后端 handler/v1/file.go + handler/share/common.go）：
 * 文件存储到本地磁盘（不走 MinIO），通过 /static-file/** 静态映射访问。
 * - POST /api/v1/file/upload         上传文件（登录）
 * - POST /api/v1/file/upload/url     通过 URL 导入文件（登录）
 * - POST /api/v1/file/upload/anydoc  按指定路径上传（无鉴权，路径安全校验）
 */
@RestController
@RequestMapping("/api/v1/file")
@RequiredArgsConstructor
public class FileController implements WebMvcConfigurer {

    private final JwtService jwtService;

    @Value("${panda.upload.dir:data/static}")
    private String uploadDir;

    /** 禁止上传的文件扩展名 */
    private static final Set<String> DENIED_EXT = Set.of(
            "exe", "sh", "bat", "cmd", "ps1", "jar", "dll", "php", "jsp", "asp", "aspx", "msi", "vbs");

    /** URL 导入最大 50MB */
    private static final long MAX_REMOTE_SIZE = 50L * 1024 * 1024;

    /** 注册 /static-file/** 静态资源映射到本地磁盘目录 */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        registry.addResourceHandler("/static-file/**")
                .addResourceLocations("file:" + dir + "/");
    }

    record UploadByUrlReq(String kb_id, String url) {
    }

    /** 上传文件（multipart: file + kb_id 可选） */
    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file,
                                      @RequestParam(value = "kb_id", required = false) String kbId,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader,
                                      HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;

        String kb = (kbId == null || kbId.isBlank()) ? UUID.randomUUID().toString() : kbId;
        String key = saveMultipart(file, kb, file.getOriginalFilename(), response);
        if (key == null) return null;

        return Map.of(
                "key", key,
                "filename", file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
    }

    /** 通过 URL 导入文件 */
    @PostMapping("/upload/url")
    public Map<String, Object> uploadByUrl(@RequestBody UploadByUrlReq req,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader,
                                           HttpServletResponse response) {
        if (!requireLogin(authHeader, response)) return null;
        if (req.url == null || req.url.isBlank()) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "url 不能为空");
        }

        String kb = (req.kb_id == null || req.kb_id.isBlank()) ? UUID.randomUUID().toString() : req.kb_id;

        byte[] data;
        try {
            data = download(req.url);
        } catch (Exception e) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "下载文件失败: " + e.getMessage());
        }

        // 从 URL 推导扩展名
        String urlPath = req.url;
        int qIdx = urlPath.indexOf('?');
        if (qIdx != -1) urlPath = urlPath.substring(0, qIdx);
        String ext = extOf(urlPath);

        String check = checkExt(ext, response);
        if (check != null) return error(response, HttpStatus.BAD_REQUEST.value(), check);

        String filename = kb + "/" + UUID.randomUUID() + ext;
        if (!writeToDisk(filename, data)) {
            return error(response, HttpStatus.INTERNAL_SERVER_ERROR.value(), "文件写入失败");
        }
        return Map.of("key", filename);
    }

    /** 按指定路径上传（Go 端无鉴权、仅 IP 校验；此处做路径穿越防护） */
    @PostMapping("/upload/anydoc")
    public Map<String, Object> uploadAnydoc(@RequestParam("file") MultipartFile file,
                                            @RequestParam("path") String path,
                                            HttpServletResponse response) {
        if (path == null || path.isBlank() || path.contains("..")) {
            return error(response, HttpStatus.BAD_REQUEST.value(), "invalid required");
        }
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;
        String ext = extOf(file.getOriginalFilename());
        String check = checkExt(ext, response);
        if (check != null) return error(response, HttpStatus.BAD_REQUEST.value(), check);

        try {
            Path target = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(cleanPath).normalize();
            if (!target.startsWith(Paths.get(uploadDir).toAbsolutePath().normalize())) {
                return error(response, HttpStatus.BAD_REQUEST.value(), "invalid required");
            }
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
        } catch (IOException e) {
            return error(response, HttpStatus.INTERNAL_SERVER_ERROR.value(), "upload failed");
        }

        return Map.of(
                "code", 0,
                "data", "/static-file/" + cleanPath);
    }

    // ---------- 内部方法 ----------

    private boolean requireLogin(String authHeader, HttpServletResponse response) {
        try {
            jwtService.parseBearer(authHeader);
            return true;
        } catch (Exception e) {
            error(response, HttpStatus.UNAUTHORIZED.value(), "Token 无效或已过期");
            return false;
        }
    }

    private String saveMultipart(MultipartFile file, String kbId, String originalName, HttpServletResponse response) {
        String ext = extOf(originalName);
        String check = checkExt(ext, response);
        if (check != null) {
            error(response, HttpStatus.BAD_REQUEST.value(), check);
            return null;
        }
        String key = kbId + "/" + UUID.randomUUID() + ext;
        try {
            Path target = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(key).normalize();
            Files.createDirectories(target.getParent());
            file.transferTo(target.toFile());
        } catch (IOException e) {
            error(response, HttpStatus.INTERNAL_SERVER_ERROR.value(), "upload failed");
            return null;
        }
        return key;
    }

    private String extOf(String filename) {
        if (filename == null) return "";
        int idx = filename.lastIndexOf('.');
        return idx >= 0 ? filename.substring(idx).toLowerCase() : "";
    }

    private String checkExt(String ext, HttpServletResponse response) {
        String plain = ext.startsWith(".") ? ext.substring(1) : ext;
        if (!plain.isEmpty() && DENIED_EXT.contains(plain)) {
            return "文件扩展名 '" + ext + "' 不允许上传";
        }
        return null;
    }

    /** 下载远程文件：禁重定向、限 50MB */
    private byte[] download(String urlStr) throws IOException {
        if (!urlStr.startsWith("http://") && !urlStr.startsWith("https://")) {
            throw new IOException("仅支持 http/https 地址");
        }
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setInstanceFollowRedirects(false);
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(30_000);
        conn.setRequestProperty("User-Agent", "PandaWiki/2.0");
        conn.setRequestMethod("GET");

        int code = conn.getResponseCode();
        if (code >= 300 && code < 400) {
            throw new IOException("出于安全原因不允许重定向");
        }
        if (code != HttpStatus.OK.value()) {
            throw new IOException("下载失败, HTTP " + code);
        }

        try (InputStream in = conn.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192];
            long total = 0;
            int n;
            while ((n = in.read(buf)) != -1) {
                total += n;
                if (total > MAX_REMOTE_SIZE) {
                    throw new IOException("文件大小超过 50MB 限制");
                }
                out.write(buf, 0, n);
            }
            return out.toByteArray();
        } finally {
            conn.disconnect();
        }
    }

    private boolean writeToDisk(String key, byte[] data) {
        try {
            Path target = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(key).normalize();
            Files.createDirectories(target.getParent());
            Files.write(target, data);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private Map<String, Object> error(HttpServletResponse response, int status, String message) {
        response.setStatus(status);
        return Map.of("success", false, "message", message);
    }
}
