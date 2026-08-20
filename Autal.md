# Autal.md - PandaWiki 项目知识库（架构 / 模块 / 表结构 / 接口约定）

> 本文档供 opencode 会话查阅项目细节。**AGENTS.md 只放工作规则，本文件放架构事实**，用到时再查。
> 毕设口述素材见 `others/bishe.md`，操作记录见 `others/oprater.md`。

---

## 一、技术栈与版本

| 组件 | 版本 | 说明 |
|---|---|---|
| Java | 21 (LTS) | 后端主语言，JDK 21，启用虚拟线程友好配置 |
| Kotlin | 2.0.21 | 与 Java 混编，`@JvmOverloads`/`@JvmDefault` 处理互调 |
| Spring Boot | 3.4.1 | Web MVC（非 WebFlux）+ JPA + Flyway + Security |
| PostgreSQL | 16-alpine（Docker） | 主库，**不带 pgvector**，向量存 `float8[]` 内存算余弦相似度 |
| Redis | 6380（Docker） | 缓存（Caffeine 一级 + Redis 二级） |
| NATS | 4222（Docker） | 消息队列，`jnats` 依赖已引入，暂未深度接入 |
| MinIO | 9000（Docker） | S3 兼容存储，**毕设简化为本地磁盘** `backend-java/data/static` |
| 前端 Admin | React + Vite | 端口 5173，管理后台 |
| 前端 App | Next.js（App Router） | 端口 3010，Wiki 前台 |
| 前端包管理 | pnpm workspace | `web/` 下 `admin/` + `app/` + `packages/` |
| 构建 | Gradle Kotlin DSL（`build.gradle.kts`） | 打包产物 `build/libs/panda-wiki-api.jar` |

**端口速查**：8080 Java 后端 / 5173 Admin / 3010 App / 5432 PG / 6380 Redis / 4222 NATS / 9000 MinIO API / 9001 MinIO 控制台。

**一键启停**：根目录 `start.cmd`（菜单）/ `stop.cmd`（按端口杀进程 + docker compose down）/ `status.cmd`。

---

## 二、后端包结构与模块职责（backend-java）

```
src/main/java/com/chaitin/pandawiki/     ← Java 包
├── controller/   UserController / KnowledgeBaseController / NodeController /
│                 NavController / FileController / CrawlerController / CreationController
├── dto/          KnowledgeBaseDtos / NodeDtos / ...
├── entity/       KnowledgeBase / Node / Nav / User / Model ...
├── repository/   Spring Data JPA Repository
├── security/     JwtService 等
└── consts/

src/main/kotlin/com/chaitin/pandawiki/   ← Kotlin 包
├── controller/   ShareController / AuthController / CaptchaController / ChatController /
│                 CommentController / FeedbackController / StatController / AppController /
│                 ModelController / LicenseController / PromptController / HealthController
├── service/      ModelService（AI 统一调用）/ EmbeddingService（向量检索）/
│                 DocumentParseService（Tika+Jsoup+飞书）/ PromptService / StatService
├── dto/          CrawlerDtos / StatDtos / ...
├── entity/       App / Model / SystemSetting ...
├── repository/
├── config/       CorsConfig / SecurityConfig / Redis 等
└── common/       response（统一返回）/ exception（全局异常）/ interceptor
```

**Kotlin 混编坑**：Lombok `@Data` 生成的 getter 对 Kotlin 编译期不可见，跨语言 DTO 用 Kotlin data class；Java 端要 `setXxx()` 赋值的字段用 `var`。

**关键文件**：
- `ShareController.kt` — App 前台 `/share/v1/**` 全部接口（webInfo / widgetInfo / navList / nodeList / nodeDetail），数据直接读表，**不读发布快照**
- `ChatController.kt` — SSE 流式问答 `/share/v1/chat/message`、`/widget`，RAG 检索 + 模型生成
- `ModelService.kt` — chat / embedding / rerank / analysis / analysis-vl 五类模型统一调度，全部 OpenAI 兼容协议
- `EmbeddingService.kt` — 向量化 + 余弦相似度检索 top5，失败降级关键词 ILIKE
- `CaptchaController.kt` — 数学验证码 challenge / redeem，内存 ConcurrentHashMap 存 token
- `StatController.kt` + `StatService.kt` — 统计聚合 / 前台埋点
- `KnowledgeBaseController.java` — KB 增删改查 + 发布（release），含 `perm` 字段映射

---

## 三、核心表结构（PostgreSQL，由 V1__init_schema.sql 建表）

| 表名 | 用途 | 关键字段 |
|---|---|---|
| `users` | 后台用户 | `account`(唯一), `password`(bcrypt), `role`(`admin`/`user`) |
| `knowledge_bases` | 知识库 | `name`, `access_settings`(jsonb: hosts/ports/base_url/watermark_setting/watermark_content...), `dataset_id` |
| `apps` | 站点配置 | `kb_id`+`type`(1=web app, 2=widget app), `settings`(jsonb: 水印/页脚/落地页/评论/主题...) |
| `nodes` | 文档/文件夹 | `kb_id`, `type`(1=文件夹,2=文档), `name`, `content`, `meta`(jsonb), `parent_id`, `position`, `status`(2=已发布), `permissions`, `nav_id` |
| `navs` | 目录（导航） | `name`, `position`, `kb_id` |
| `models` | AI 模型配置 | `type`(唯一: chat/embedding/rerank/analysis/analysis-vl), `provider`, `api_key`, `api_header`, `base_url`, `is_active` |
| `conversations` | AI 会话 | `kb_id`, `app_id`, `subject`, `info`(jsonb) |
| `conversation_messages` | 对话消息 | `role`, `content`, `info`(jsonb: score/feedback), `kb_id`, `parent_id` |
| `node_embeddings` | 文档向量 | `node_id`, `kb_id`, `chunk_text`, `embedding float8[]`（V3 建表） |
| `comments` | 文档评论 | `node_id`, `kb_id`, `content`, `status`(0待审/1通过), `info`, `pic_urls` |
| `stat_pages` | 访问统计埋点 | `kb_id`, `node_id`, `scene`, `ip`, `ua`, `referer`... |
| `stat_page_hours` | 按小时聚合统计 | 去重计数 + 各类 Top 排行 JSONB |
| `kb_users` | 知识库权限 | `kb_id`, `user_id`, `perm`(`full_control`/`doc_manage`/`data_operate`) |
| `kb_releases` / `node_releases` | 发布快照 | 历史版本回滚（App 前台当前不读快照） |
| `settings` | 按 kb 配置项 | `kb_id`+`key`(唯一), `value`(jsonb)，如 `system_prompt` |
| `system_settings` | 全局配置 | 如 `model_setting_mode` |
| `api_tokens` / `auths` / `auth_configs` | 认证 | OAuth/API Token（部分为预留） |

**权限模型**：全局角色 `users.role` + 知识库权限 `kb_users.perm` + 文档三开关 `nodes.permissions`（visible/visitable/answerable）。

---

## 四、接口约定

### 4.1 响应格式

- **Admin 前端**（`/api/**`）：Java 后端返回**原始 JSON**（如 `{"models":[...]}`），前端 `httpClient.ts` / `api/request.ts` 拦截器兼容两种格式（带/不带 `success` 包装）
- **App 前台**（`/share/**`）：对齐 Go 版 `PWResponse`：`{"success": true, "code": 0, "message": "OK", "data": ...}`
- **pro 接口**（`/api/pro/**`）：`{success, code, message, data}`

### 4.2 SSE 流式约定

- **接口**：`POST /share/v1/chat/message`、`POST /share/v1/chat/widget`、`POST /api/v1/node/summary/stream`
- **事件顺序**：`conversation_id` → `message_id` → `chunk_result`（检索引用）→ `data`（回答片段）→ `done`/`error`
- **数据格式**：每个 SSE 事件 `data:` 后是 **JSON**（含 `type`/`content` 字段），如 `{"type":"data","content":"..."}`
- **前端解析**：`fetch.ts` 用 `startsWith('data: ')` 匹配（要求 `data:` 后带空格）
- **收尾约定**：发完 `error` 事件后必须用 `emitter.complete()` 正常关闭连接

### 4.3 App 前台知识库定位（kb_id 解析优先级）

```
1. HTTP header: x-kb-id
2. URL 参数:   ?kb_id=xxx
3. 环境变量:   DEV_KB_ID（web/app/.env.local）
4. 后端回退:   knowledge_bases 表 created_at 最早的一条
```

- Admin「访问 Wiki 网站」按钮（`web/admin/src/components/Header/index.tsx`）按 `access_settings.hosts+ports` 拼访问地址，并携带 `?kb_id=` 定位当前知识库
- App 的 `proxy.ts` 从 URL 参数或 header 读取 kb_id 并注入 `x-kb-id`；客户端 `httpClient.ts` 自动从 `window.location.search` 读 `kb_id` 加 header
- **Widget 同理**：`widget-bot.js` 用 `data-api-domain` + `data-kb-id` 指定后端与知识库，iframe URL 带 `kb_id` 参数

---

## 五、全局组件 / 工具类

- **统一返回**：Share 系接口用 `ok(data)` / `err(msg)` 包装 `{success, code, message, data}`
- **全局异常**：`common/exception/`，Kotlin 侧实现
- **CORS**：`config/CorsConfig.kt` 允许所有来源（供 Widget 跨域）
- **JWT**：`security/JwtService`，claims 含 `id`/`role`/`exp`
- **验证码**：`CaptchaController.kt` 提供 `validateToken()` 供评论/问答复用；token 5 分钟有效，校验通过后保留 5 分钟可复用（演示场景）
- **文件存储**：本地磁盘 `data/static`，`/static-file/**` 静态映射；上传接口 `/api/v1/file/upload`、`/upload/url`、`/upload/anydoc`

---

## 六、前端结构要点

### Admin（web/admin，Vite）
- `request/`：按模块拆分的 API（Auth/Node/KB/Model/Stat/Crawler...），`httpClient.ts` 是核心封装
- `components/Header/index.tsx`：**「访问 Wiki 网站」按钮**（拼 hosts+ports+`?kb_id=`）
- `components/Sidebar/index.tsx`：按 `kbDetail.perm` 过滤菜单
- `pages/setting/`：站点设置（安全设置/水印/模型/AI 机器人等）
- 登录：`POST /api/v1/user/login`，token 存 `localStorage.panda_wiki_token`

### App（web/app，Next.js App Router）
- `src/proxy.ts`：Next.js 中间件，**所有 /share 请求透传到 8080**，注入 `x-kb-id`
- `src/app/layout.tsx`：服务端加载 kbDetail（`getShareV1AppWebInfo`）+ authInfo
- `src/components/watermark/`：水印 Provider + Canvas 组件
- `src/utils/useMathCaptcha.tsx`：中文数学验证码弹窗（MUI Dialog），token 缓存 localStorage 5 分钟
- `src/views/home/index.tsx`：欢迎页，按 `settings.web_app_landing_configs` 动态渲染组件
- `src/views/node/index.tsx`：文档渲染（Tiptap 只读），type=1 文件夹 / type=2 文档
- `src/components/QaModal/AiQaContent.tsx`：Ctrl+K 智能问答弹窗，SSE 流式

### 环境变量（web/app/.env.local）
```
TARGET=http://localhost:8080        # 后端地址
STATIC_FILE_TARGET=http://localhost:8080
SHARE_TARGET=http://localhost:8080
DEV_KB_ID=                          # 可选，固定知识库
```

---

## 七、License 与版本控制（毕设解锁）

- `LicenseController.kt` 返回 `edition=3`（企业版）解锁知识库/管理员数量限制
- 前端 `constant/version.ts` 存 4 套配置：免费(0)/专业(1)/旗舰(2)/企业(3)
- `UserController.java` 中 `MAX_ADMIN = 1` 控制免费版超级管理员数量
