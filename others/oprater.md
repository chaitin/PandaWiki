# 操作记录

## 2026-08-11

### Java 后端补齐用户管理与文件上传接口
- 新增 `JwtService.java`：公共 JWT 解析工具（供 Auth/User/File 复用）
- 新增 `UserController.java`：POST /api/v1/user/create、GET /list、DELETE /delete、PUT /reset_password（含免费版 admin 数量限制、bcrypt 加密、删除保护）
- 新增 `FileController.java`：POST /api/v1/file/upload、/upload/url、/upload/anydoc，实现 /static-file/** 静态资源映射到本地磁盘 data/static
- 修改 `application.yml`：multipart 上传上限 50MB
- 文件存储方案：本地磁盘（backend-java/data/static），不走 MinIO
- 已实测：用户增删改查、文件上传/URL 导入/路径穿越防护全部通过

### 排查（未改代码）
- 确认「新建知识库」入口在顶部知识库下拉框底部「创建新 Wiki 站」按钮，因免费版 wikiCount=1 且已有 1 个知识库，按钮被禁用
- 确认「目录和文档同名」是产品设计（无唯一约束，前端靠 id 定位）

### 解锁多知识库
- 修改 `LicenseController.kt` 返回 edition 0→3（企业版），解锁知识库/管理员数量上限；Kotlin 文件需手动 gradlew compileKotlin 触发 DevTools 重启

### 修复模型弹窗"网络异常"
- 根因：模型弹窗走老封装 api/request.ts，强制要求响应带 success 字段，Java 返回 raw 格式被误判失败
- 修复：api/request.ts 拦截器兼容 raw + Go 包装两种格式（对齐新封装 httpClient）

### 实现真实模型列表获取
- ModelController 的 /model/provider/supported 改为真实调用 {base_url}/models（OpenAI 兼容协议），用 api_key 鉴权
- 删除原来的 hardcode 假列表（default-model）；DTO 增加 error 字段返回具体错误

### 实现 AI 调用接口
- 新增 `ModelService.kt`：统一封装 chat/embedding/rerank 三类模型调用（OpenAI 兼容协议）
- 新增 `ChatController.kt`：App 前台 AI 问答接口 `/share/v1/chat/search`、`/share/v1/chat/completions`
- 新增 `CreationController.java`：Admin AI 续写 `/api/v1/creation/tab-complete`
- 扩展 `NodeController.java`：Admin AI 摘要 `/api/v1/node/summary`、`/api/v1/node/summary/stream`
- 修复 Kotlin-Java 互编译问题：`@JvmOverloads` 暴露默认参数、Java 端显式 cast Object
- 调整 chat/search SQL：检索 `status=2 AND type=2` 的已发布文档（原 SQL 误查文件夹/草稿）
- 补充 `GET /api/v1/node/detail`：Admin 点击文档查看详情报 405，补读库接口
- 新增 `POST /api/v1/knowledge_base/release`：实现知识库发布，将节点状态改为已发布并写入发布快照表
- 新增 `GET /api/v1/knowledge_base/release/list`：查询发布历史列表
- 新增 `CaptchaController.kt`：实现 App 前台验证码 `POST /share/v1/captcha/challenge`、`/redeem`，解决智能问答弹窗"验证失效"
- 编译命令：`.\gradlew.bat compileKotlin compileJava --rerun-tasks --no-daemon`

### 修复智能问答/搜索文档 500（验证失效）
- 根因：`CaptchaController` 的 challenge/redeem 要求请求头 `x-kb-id`，但前端 `@cap.js/widget` 调用验证码时不会带该 header，后端抛 `IllegalArgumentException` 导致 500
- 修复：移除 CaptchaController 对 `x-kb-id` 的强制校验（验证码功能本身不依赖知识库 ID）
- 验证：curl 测试 `/share/v1/captcha/challenge`、`/share/v1/chat/search`、`/share/v1/chat/completions` 均返回 200
- 操作：杀掉 8080 端口进程，重新 `.\gradlew.bat bootRun` 启动 Java 后端

### 修复智能问答 404（chat/message 未实现）
- 根因：前端 `AiQaContent.tsx` 使用 SSE 流式请求 `/share/v1/chat/message`，但 Java 后端只实现了 `/share/v1/chat/completions`（普通 JSON POST），路径不存在导致 404
- 修复：在 `ChatController.kt` 新增 `POST /share/v1/chat/message`，用 `SseEmitter` 返回前端期望的事件流：`conversation_id`、`message_id`、`chunk_result`、`data`、`done`、`error`
- 实现：先做关键词检索知识库文档，再调用 `modelService.chat()` 生成完整回答，按 8 字符分段模拟流式输出
- 验证：curl SSE 测试返回了 `conversation_id`、`message_id` 等事件；后续模型调用返回 402（账户余额不足），属于模型 API 配置问题，接口本身已通
- 操作：停止旧 Java 后端，重新 `.\gradlew.bat bootRun`

### 修复智能问答 network error（SSE 连接异常关闭）
- 现象：EventStream 已收到 `error` 事件，但 Console 报 `ERR_INCOMPLETE_CHUNKED_ENCODING 200 (OK)`，前端显示 network error
- 根因：`ChatController.kt` 发送 `error` 事件后调用 `emitter.completeWithError(e)`，导致 Tomcat 异常断开 SSE 连接
- 修复：改为 `emitter.complete()` 正常关闭，让 error 事件完整到达前端
- 操作：停止旧 Java 后端，重新 `.\gradlew.bat bootRun`

## 2026-08-12

### 实现向量检索（embedding 相似度）
- 新增 migration `V2__node_embeddings.sql`：建 `node_embeddings` 表存向量（float8[]），不依赖 pgvector 扩展
- 新增 `EmbeddingService.kt`：全量向量化 reindexKb / 懒加载 ensureIndexed / 向量检索 search（内存算余弦相似度 top5）
- 修改 `ChatController.kt`：searchNodes 改为优先向量检索，embedding 失败降级 ILIKE；新增 `POST /share/v1/chat/reindex` 接口
- 说明：首次问答自动向量化；一篇已发布文档生成 1 条向量（content 前 2000 字）
- 编译命令：`.\gradlew.bat compileKotlin --no-daemon`

### 修复 Flyway migration 版本冲突
- 根因：新建的 `V2__node_embeddings.sql` 与已有 `V2__seed_default_admin.sql` 版本号撞了，启动报 `Found more than one migration with version 2`
- 修复：改名为 `V3__node_embeddings.sql`

### 修复智能问答界面一直转圈（SSE 格式不匹配）
- 现象：向量检索成功、EventStream 能看到 chunk_result/data 事件，但界面一直转不显示回答
- 根因：前端 `fetch.ts` processChunk 用 `startsWith('data: ')`（要求 data: 后带空格）匹配，而 Spring SseEmitter 发送 `data:{json}`（无空格），一行都解析不到 → 收不到 done → loading 永不关闭
- 修复：前端改为兼容 `data:xxx` 和 `data: xxx` 两种格式

### 修复 Admin 智能摘要点击无内容（SSE 格式不匹配）
- 现象：Admin 编辑器点「AI 自动生成摘要」，请求 200 但文本框无内容
- 根因：`NodeController.summaryStream` 用 `SseEmitter.event().data(summary)` 发送**纯文本**，但前端 `fetch.ts` 配置 `responseMode: 'sse-json'`，会 `JSON.parse(data)` 解析，导致解析失败、`setSummary` 不触发
- 修复：注入 `ObjectMapper`，把摘要包装为 `{"type":"data","content":"..."}` 再发送，与 `ChatController` 的 SSE 事件格式对齐
- 文件：`backend-java/src/main/java/com/chaitin/pandawiki/controller/NodeController.java`
- 编译命令：`cd backend-java && .\gradlew.bat compileJava compileKotlin -q`

### 修复 Admin/App 文本润色字段不匹配并支持流式
- 现象：编辑器选中文字后点「文本润色」，请求 200 但右侧无内容或只显示引号
- 根因：`CreationController.text` 读取 `prompt` 字段，但前端发送的是 `text` + `action` + `stream`；且后端返回普通字符串，前端按 SSE raw 模式解析
- 修复：
  - 改为读取 `text` 和 `action` 字段
  - 根据 `action`（rephrase/summary/extend/shorten）构造不同 prompt
  - 使用 `HttpServletResponse` 以 `text/event-stream` 返回，并将结果按 8 字符分段、40ms 间隔模拟流式输出
- 文件：`backend-java/src/main/java/com/chaitin/pandawiki/controller/CreationController.java`
- 编译命令：`cd backend-java && .\gradlew.bat compileJava compileKotlin -q --no-daemon`

### 修复 Admin 左侧缺少「设置」菜单
- 现象：Admin 左侧 Sidebar 只有帮助文档/GitHub/在线支持，没有「文档」「统计」「设置」等菜单
- 根因：`KnowledgeBaseController` 返回的知识库详情缺少 `perm` 字段，前端 `Sidebar` 按 `kbDetail.perm` 过滤菜单，`perm` 为空导致所有需要权限的菜单被过滤掉
- 修复：`KnowledgeBaseController` 注入 `JwtService`，根据当前登录用户 JWT 的 `role` 返回 `perm`：admin 返回 `"full_control"`，其他返回 `""`；list/detail/create/update 四个接口都补上该字段
- 文件：`backend-java/src/main/java/com/chaitin/pandawiki/controller/KnowledgeBaseController.java`、`dto/KnowledgeBaseDtos.java`
- 编译命令：`cd backend-java && .\gradlew.bat compileJava compileKotlin -q --no-daemon`

### Widget 问答功能（第 1、2 步：App 实体与 AppController）
- 新增 `App.kt` 实体：对应 `apps` 表（id/kb_id/name/type/settings jsonb/created_at/updated_at）
- 新增 `AppRepository.kt`：提供 `findByKbIdAndType(kbId, type)`
- 新增 `AppController.kt`：
  - `GET /api/v1/app/detail?kb_id=xxx&type=2`：查询 widget app 配置
  - `PUT /api/v1/app?id=xxx`：保存 widget app 配置，不存在则自动创建
  - 返回统一 `{success, code, message, data}` 格式，兼容前端 httpClient 拦截器
- 文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/entity/App.kt`、`AppRepository.kt`、`controller/AppController.kt`
- 编译命令：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

### Widget 问答功能（第 3、4 步：Widget 公开接口）
- 新增 `GET /share/v1/app/widget/info`：供嵌入脚本 `widget-bot.js` 读取挂件配置，返回 `name`/`base_url`/`settings.widget_bot_settings`
- 重写 `POST /share/v1/chat/widget`：从空壳改为真实 SSE 流式 RAG 问答
  - 抽取 `streamChat` 私有方法，复用 `/message` 的检索 + 模型调用逻辑
  - 支持 `conversation_id` 和 `nonce` 透传
  - 输出事件：`conversation_id`、`message_id`、`nonce`、`chunk_result`、`data`、`done`、`error`
- 现象：Admin 系统设置-模型配置里点「检测」永远返回成功，即使 base_url/api_key 填错
- 根因：`ModelController.check` 直接返回 `CheckModelResp(content="ok")`，未真实调用模型
- 修复：根据模型 `type` 真实调用对应接口：
  - `chat` / `analysis` / `analysis-vl`：调 `POST /chat/completions`，验证能否返回内容
  - `embedding`：调 `POST /embeddings`，验证能否返回向量
  - `rerank`：调 `POST /rerank`，验证能否返回排序分数
  - 支持 `api_header` 自定义鉴权头，否则默认 `Authorization: Bearer {api_key}`
  - 失败时通过 `error` 字段返回具体错误（HTTP 状态码 + 响应片段）
- 文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ShareController.kt`、`ChatController.kt`
- 编译命令：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

### Widget 悬浮球配置不生效问题
- 现象：`test-widget.html` 悬浮球位置/图标不随 Admin 配置变化
- 根因 1：`widget-bot.js` 请求 `widget/info` 时用了 App 前端域名（3010），但接口在 Java 后端（8080）
- 根因 2：Java 后端未配置 CORS，浏览器跨域预检 OPTIONS 请求返回 403
- 修复：
  - `widget-bot.js` 增加 `data-api-domain` 和 `data-kb-id` 属性，用后端地址请求配置，iframe 带 `kb_id` 参数
  - `widget/layout.tsx` 从 `x-current-search` header 读取 `kb_id`，服务端获取 widget 配置
  - `proxy.ts` 的 `/widget` 检查从 URL 参数读取 `kb_id`
  - `httpClient.ts` 客户端请求自动从 URL 参数读取 `kb_id` 并加入 `x-kb-id` header
  - `AiQaContent.tsx` 的 SSE 请求手动加 `x-kb-id`
  - 新增 `CorsConfig.kt`：全局 CORS 允许所有来源、所有方法、所有头
- 文件：`web/app/public/widget-bot.js`、`web/app/src/app/widget/layout.tsx`、`web/app/src/proxy.ts`、`web/app/src/request/httpClient.ts`、`web/app/src/views/widget/AiQaContent.tsx`、`backend-java/src/main/kotlin/com/chaitin/pandawiki/config/CorsConfig.kt`
- 编译命令：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

### 实现模型连通性检测（model check）
- 文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ModelController.kt`
- 编译命令：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

## 2026-08-13

### 补齐 analysis / analysis-vl 模型调度与 CardAI 提示词

- 扩展 `ModelService.kt`：新增 `chatByType`、`analyzeDocument`、`analyzeImage`，支持按类型调用 analysis/analysis-vl 模型，未配置时降级到 chat 模型
- 扩展 `ModelController.kt`：新增 `POST /api/v1/model/analyze`（文档分析）和 `POST /api/v1/model/analyze-image`（图像分析）
- 修改 `NodeController.java`：AI 摘要改为优先调用 analysis 模型，并使用知识库配置的摘要提示词
- 新增 `PromptService.kt`：读写 `settings` 表 `system_prompt` 记录，实现自定义/通用提示词生成逻辑
- 新增 `PromptController.kt`：实现 `GET /api/pro/v1/prompt` 和 `PUT /api/pro/v1/prompt`，对齐原 Go pro 接口
- 修改 `ChatController.kt`：RAG 问答的 system prompt 优先使用知识库 CardAI 配置，未配置时使用默认提示词
- 编译命令：`cd backend-java && .\gradlew.bat bootJar --no-daemon`
- 操作：需停止旧 Java 后端，重新启动（本次修改涉及启动后的 bean 与接口映射）

### 修复 CardAI 提示词保存后刷新丢失

- 现象：Admin「设置 → 智能问答」保存自定义提示词成功，但刷新页面后内容消失；数据库里已写入
- 根因：`PromptService.getPrompt` 读取 PostgreSQL `jsonb` 字段时，Spring JDBC 返回的是 `PGobject` 而不是 `String`/`Map`，代码走 `else -> Prompt()` 分支，导致解析为空对象
- 修复：`else` 分支用 `value?.toString()` 取 PGobject 的 JSON 字符串，再反序列化为 `Prompt`
- 文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/service/PromptService.kt`
- 编译命令：`cd backend-java; .\gradlew.bat compileKotlin compileJava -q --no-daemon`
- 操作：需重新启动 Java 后端

### 实现文档导入（本地文件 / URL 抓取 / 飞书文档）

- 新增 `CrawlerSource.java` 枚举：对齐前端 ConstsCrawlerSource，getType() 区分 file/url/key 三类
- 新增 `CrawlerDtos.kt`（Kotlin data class）：ParseReq/ExportReq/ResultReq/ResultsReq/ParseResp/ExportResp/ResultResp/ResultsResp/ResultItem/DocsTree/DocValue/FeishuSetting
  - 踩坑：原 Java Lombok @Data 在 Kotlin 侧编译期不可见 getter，改为 Kotlin data class 解决
  - Response DTO 的 var 必须可写，否则 Java 端 resp.setXxx() 编译报错
- 新增 `DocumentParseService.kt`：
  - `parseLocalFile`：txt/md/html 直接读，其余走 Apache Tika（AutoDetectParser）解析 PDF/Word/Excel 等
  - `parseUrl`：Jsoup 抓取正文（article/main/role=main/常见 class 兜底）+ 去噪声 + Flexmark 转 Markdown
  - 飞书：app_access_token（internal）→ 文档搜索或知识空间节点列表 → 内容导出（docx raw_content / document content 兼容）
  - 下载安全：禁重定向防 SSRF、限 50MB、路径穿越校验
- 新增 `CrawlerController.java`：POST /api/v1/crawler/parse、/export、/results + GET /result
  - 内存任务存储 ConcurrentHashMap + 定时清理（30 分钟过期）
  - 飞书 setting 在 parse 阶段缓存，export 阶段按 id 取回（解决 export 请求不带凭证的问题）
- 编译命令：`cd backend-java && .\gradlew.bat compileJava compileKotlin -q --no-daemon`
- 联调验证（8081 端口）：URL 抓取 example.com、本地文件上传+解析、批量 results 查询、飞书错误透传全部通过
- 操作：重新编译后启动 Java 后端即可（无需动数据库）

## 2026-08-17

### 修复 Admin「智能摘要提示词」保存后回显空白
- 现象：Admin「设置 → 问答设置」里填写「智能摘要提示词」保存，切到别的 Tab 再回来，文本框变空白
- 根因：`backend-java/build/libs/panda-wiki-api-2.11.1.jar` 构建于 8/13，而 `PromptController.kt`/`PromptService.kt` 在 8/17 才加入 `summary_content` 字段支持；运行中的 Java 后端仍是旧包，PUT 时忽略/丢失摘要提示词，GET 时也不返回该字段
- 修复：重新打包 `cd backend-java && .\gradlew.bat bootJar -x test --no-daemon`，生成包含最新 PromptController/PromptService 的 JAR
- 验证：在 8081 端口临时启动新包，curl 测试 PUT `summary_content` 后 GET 能正确回显，包括空字符串也能正常返回
- 操作：停止当前 8080 端口的旧 Java 后端，再执行 `cd backend-java && java -jar build/libs/panda-wiki-api-2.11.1.jar` 启动新包
- 补充：用户重启后反馈中文变成 `???`，原因是前面我用 PowerShell 命令行直接传中文恢复数据时，终端编码把中文变成了问号字节；已改用 UTF-8 文件作为请求体重新写入正确中文，并通过 hex 校验确认数据库里存的是真实 UTF-8 中文
- 顺手修复 `web/app/src/views/widget/AiQaContent.tsx` 的 TypeScript 类型报错：`@cap.js/widget` 的 `cap.solve()` 返回类型 `SolveResult` 没有声明 `expires`，已用 `as { token: string; expires?: number }` 断言兼容

### 说明 App 前台知识库切换机制（未改代码）
- Admin 有 `KBSelect` 组件（`web/admin/src/components/KB/KBSelect.tsx`），调用 `GET /api/v1/knowledge_base/list`，切换时写 Redux + localStorage
- App 前台没有知识库切换 UI，设计上一个 App 实例只服务一个知识库
- App 确定当前知识库的方式：服务端 `x-kb-id` header → URL `?kb_id=` → 环境变量 `DEV_KB_ID` → 后端回退第一个知识库
- 后端接口 `GET /share/v1/app/web/info` 根据 `x-kb-id` 返回 `base_url` 和 `settings`
- 多知识库通过不同 `base_url`（访问地址）访问；本地调试可用 `?kb_id=xxx` 临时切换
- `start.cmd` 未设置 `DEV_KB_ID`，因此本地 `http://localhost:3010` 总是回退到 `knowledge_bases` 表中 `created_at` 最早的知识库

### 说明 App 前台如何显示 Admin 文档（未改代码）
- 完整链路：Admin 编辑器保存 → `PUT /api/v1/node` → `nodes` 表 → Admin 发布 → `POST /api/v1/knowledge_base/release` → `nodes.status=2` + 生成发布快照 + 向量化
- Java 后端目前直接读 `nodes` 表给 App 用，不读发布快照（注释写明暂不生成 node_releases 发布版本）
- App 打开首页时，Next.js 中间件 `proxy.ts` 调用 `GET /share/v1/node/list` 取目录树，重写到第一个文档 `/node/xxx`
- 文档详情页 `[id]/page.tsx` 服务端调用 `GET /share/v1/node/detail?id=xxx` 拿单篇内容
- 前端 `views/node/index.tsx` 用 `useTiptap` 以只读模式渲染 `content`；`type=1` 是文件夹，`type=2` 是文档

### 说明 App 前台智能问答人机验证流程（未改代码）
- 触发点：`components/QaModal/AiQaContent.tsx` 的 `chatAnswer` 在发 SSE 请求前先 `await requestCaptcha()`；图片上传也先调验证码
- 弹窗实现：`utils/useMathCaptcha.tsx` 自定义 Hook，返回 `captchaDialog`（MUI Dialog）和 `requestCaptcha`（Promise）
- 后端出题：`POST /share/v1/captcha/challenge` 生成两个 1~20 整数相加，token 与答案存内存 `ConcurrentHashMap`，5 分钟过期
- 前端校验：`POST /share/v1/captcha/redeem` 提交 token + 答案，后端校验正确后删除 token 防重放
- 通过后再发 `POST /share/v1/chat/message`，请求体带 `captcha_token`
- 防刷：连续错误 3 次前端写入 localStorage 锁定 5 分钟，显示倒计时
- 踩坑：验证码用原生 fetch，绕过 httpClient 统一封装，避免 token 被 `response.data` 包装吃掉

### 说明 App 前台欢迎页与 Ctrl+K 智能问答弹窗原理（未改代码）
- 欢迎页路由为 `/welcome`，由 `web/app/src/app/(pages)/(doc)/welcome/page.tsx` 复用 `home/page.tsx`，组件渲染在 `web/app/src/views/home/index.tsx`
- 欢迎页内容不是写死的，而是读取 `kbDetail.settings.web_app_landing_configs` 动态渲染；若 Admin 未配置落地页组件，则只有顶栏/页脚
- Ctrl+K 快捷键注册在 `web/packages/ui/src/header/index.tsx` 和 `welcomeHeader/index.tsx`，通过 `window.addEventListener('keydown')` 监听 `metaKey||ctrlKey && key==='k'`，调用 `onQaClick` 打开弹窗
- App 中 `onQaClick` 对应 `setQaModalOpen(true)`，弹窗组件 `QaModal` 在 `web/app/src/components/QaModal/index.tsx`
- 智能问答内容在 `AiQaContent.tsx`，流程：输入 → 数学验证码 → SSE 请求 `/share/v1/chat/message` → 接收 `conversation_id`/`message_id`/`chunk_result`/`data`/`done`/`error` 事件并流式渲染
- 仅搜索文档内容在 `SearchDocContent.tsx`，调用 `POST /share/v1/chat/search`

## 2026-08-14

### 方向三：统计/数据分析（Java 后端补齐 + Admin 看板）
- 新增 `StatDtos.kt`：统计模块请求/响应 DTO
- 新增 `StatService.kt`：聚合查询（count、instant、hot pages、referer、browsers、geo、conversation distribution、hot questions）+ 简易 UA/IP 解析
- 新增 `StatController.kt`：
  - 管理端 `GET /api/v1/stat/{count|instant_count|instant_pages|geo_count|conversation_distribution|hot_pages|referer_hosts|browsers|hot_questions}`
  - 前台 `POST /share/v1/stat/page` 访问日志埋点
- 前台 App 埋点：`web/app/src/app/(pages)/(doc)/home/page.tsx`（欢迎页 scene=1）、`web/app/src/views/node/index.tsx`（文档详情页 scene=2）
- Admin 前端：`web/admin/src/request/StatExtra.ts` + `HotQuestions.tsx` + `Statistic/index.tsx` 新增热门问题卡片
- 验证：8081 端口 curl 测试所有接口通过；浏览器打开 Admin 统计页，访问次数/用户数/IP 数/实时来访/用户分布/来源域名/热门文档/客户端/热门问题均正常展示
- 操作：重新编译并重启 Java 后端（当前 8080 仍在运行，需停止后启动新版本）

### 实现真实版人机验证（中文数学题弹窗）
- 后端 `CaptchaController.kt`：
  - `challenge` 生成真实数学题（两个 1~20 整数相加），token 5 分钟有效，存内存
  - `redeem` 校验答案，正确返回 token 并移除防重放，错误提示"答案错误，请重新验证"
  - 保持裸 JSON 返回格式，兼容 `@cap.js/widget` 和自定义弹窗
- 前端新增 `web/app/src/utils/solveMathCaptcha.ts`：
  - 自定义白色中文弹窗（标题"安全验证"、输入框、取消/确定按钮）
  - 错误答案自动重新 challenge，最多重试 3 次
  - 用原生 fetch 直接调 `/share/v1/captcha/challenge` 和 `/redeem`，绕过 httpClient 统一包装
- 替换 `components/QaModal/AiQaContent.tsx` 中 AI 问答流程的 `@cap.js/widget` 调用为 `solveMathCaptcha`
- 验证（8081 后端 + 3011 App）：
  - 输入问题后弹出中文验证码弹窗
  - 错误答案自动刷新题目
  - 正确答案后 Network 依次出现 challenge → redeem → chat/message，SSE 流式返回答案
- 操作：重新编译并重启 Java 后端；重新启动 App 前端 dev server（热更新可能不生效）

### 修复验证码弹窗无法输入数字
- 根因：手写的 DOM 弹窗可能被页面层级（MUI 遮罩、pointer-events、全局样式）影响，导致输入框无法聚焦/输入
- 修复：
  - 新增 `web/app/src/utils/useMathCaptcha.tsx`：基于 MUI Dialog 的中文数学验证码 Hook，自动管理焦点和遮罩层
  - 删除 `web/app/src/utils/solveMathCaptcha.ts`（手写 DOM 方案）
  - `components/QaModal/AiQaContent.tsx` 改用 `useMathCaptcha`，在 JSX 中渲染 `captchaDialog`
- 验证（8081 后端 + 3011 App）：
  - 输入框可正常输入数字
  - 错误答案自动刷新题目（9+11 → 8+8）
  - 正确答案后弹窗关闭，AI 正常返回答案
- 操作：重新启动 App 前端 dev server

### 优化验证码弹窗 UI 与锁定策略
- 需求：去掉"为防止恶意请求"文案；算式数字高亮白色加粗；连续错误 3 次后锁定 5 分钟；错误时不关闭弹框，仅刷新算式
- 实现：修改 `web/app/src/utils/useMathCaptcha.tsx`
  - 移除提示文案，只显示算式
  - 数字用 22px / 700 / #fff 高亮，运算符用 18px / 400 / rgba(255,255,255,0.7)
  - 错误时弹框内显示"验证失败，请重新输入"并刷新算式
  - 连续 3 次错误后写入 localStorage 锁定时间戳，显示"验证失败次数过多，请 X分X秒 后重试"，隐藏输入框与确定按钮
  - 锁定期间再次触发验证直接显示锁定倒计时
- 验证（8081 后端 + 3011 App）：
  - 弹窗无"为防止恶意请求"文案
  - 数字高亮白色加粗
  - 3 次错误后进入锁定状态，倒计时实时递减
  - 锁定期间重新提问直接提示锁定
- 操作：重新启动 App 前端 dev server

### 规划 OAuth2 / 短信 / 微信扫码登录方案（未改代码）
- 与用户确认功能范围：不做微博/QQ，主做「微信扫码 + 手机号验证码 + 保留账号密码」三端共存
- 确认 admin/admin123 密码登录保留，新增登录方式不替代
- 输出可执行实现计划，涉及 Java 后端新接口、数据库 migration、Redis 临时存储、Admin 登录页改造
- 将 SSO/OAuth2/短信登录的区别、完整链路、安全设计、答辩要点写入 `others/bishe.md`
- 解释 Admin 后台为什么没有注册功能：PandaWiki 设计为 Admin 后台仅管理员使用、普通员工走 App 前台；当前 Java 后端 App 前台尚未实现访问控制
- 在 `bishe.md` 补充 13.8/13.9：Admin/App 两套入口的定位、企业场景下员工访问知识库的方式

### 解答管理员/权限/Wiki 站配置问题（未改代码）
- 说明 `users.role` 两种取值：`admin` 超级管理员、`user` 普通管理员
- 说明免费版超级管理员限制为 1 个，前端按 License 版本限制（专业版 20、企业版 50）
- 说明知识库级权限 `kb_users.perm`：`full_control` 完全控制、`doc_manage` 文档管理、`data_operate` 数据运营
- 说明「访问 WIKI 网站」按钮打开当前知识库对外公开地址
- 说明「复制用户信息」报错因 `navigator.clipboard` 要求 https/localhost 安全上下文
- 说明 Wiki 站表单字段含义及存储位置 `knowledge_bases.access_settings` jsonb

### 说明首次登录/注册超级管理员机制（未改代码）
- 系统无注册入口，首次登录使用 Flyway 迁移预置的 `admin/admin123`
- 登录接口 `POST /api/v1/user/login`，源码在 `AuthController.kt`
- 预置账号写入 `V2__seed_default_admin.sql`
- 登录后可在 Admin「用户管理」创建其他管理员；免费版仍受 `MAX_ADMIN = 1` 限制
- 当前内置 admin 密码无法通过「重置密码」接口修改，`.env` 方案代码未实际实现

### 简化 Admin 设置页（改代码）
- 门户网站：隐藏前置反向代理、HTTPS 端口、智能问答版权信息、访问认证、目录设置、SEO、自定义代码、统计设置
- 服务监听方式：仅保留域名/IP 和 HTTP 端口，默认端口改为 3010
- AI 机器人：仅保留网页挂件机器人，隐藏 API、钉钉、微信、企微、飞书、Lark、Discord 等卡片
- 修改文件：`web/admin/src/pages/setting/component/CardWeb.tsx`、`CardListen.tsx`、`Step2Config.tsx`、`Header/index.tsx`、`CardRobot.tsx` 等

### 修复网页挂件机器人「未配置域名」提示（改代码）
- 原因：`CardRobotWebComponent` 中 `if (ssl_ports)` 把空数组当 true，导致 HTTP 分支走不到
- 修复：改为 `ssl_ports && ssl_ports.length > 0`
- 修改文件：`web/admin/src/pages/setting/component/CardRobot/WebComponent/index.tsx`

### 修复妃妃知识库访问报"页面无法加载" & 统一水印颜色

- **现象**：Admin 点「访问 Wiki 网站」打开妃妃知识库 `http://localhost:3010/?kb_id=6b77256d...`，任何页面直接显示"页面无法加载"；测试知识库正常。且水印颜色随背景反色，视觉不稳定。
- **根因**：
  - SSR 阶段（`proxy.ts`、`app/layout.tsx`、`(pages)/layout.tsx`）调用 `getShareV1AppWebInfo()` 无参，`getServerHeader()` 只读 `x-kb-id` header + `DEV_KB_ID`，**不读 URL `?kb_id=`**。
  - 浏览器访问 `?kb_id=妃妃` 时 header 里没有 `x-kb-id`，SSR 回退到 `created_at` 最早 = 测试知识库 → 渲染测试库配置（home_page_setting=doc → rewrite 到 `/node/测试第一个node`）。
  - 客户端 httpClient 从 `window.location.search` 读 `kb_id=妃妃` 加 header → 请求 node detail → 妃妃里没有测试库那个 node → 404。
  - 测试知识库正常是因为回退库恰好就是它自己，SSR/CSR 一致。
- **修复**：
  1. `getServerHeader.ts`：从 proxy 设置的 `x-current-search` header 解析 `kb_id`，优先级 `kbId` > `x-kb-id` header > `x-current-search` 里的 `kb_id` > `DEV_KB_ID`。
  2. `proxy.ts`：显式从 `url.searchParams.get('kb_id')` 读取，传给 `getShareV1AppWebInfo({ headers })`、`getFirstNode(kbId)`、`getHomePath(kbId)`；`proxyShare` 也传 `urlKbId`。
  3. 统一水印颜色：`(doc)/layout.tsx` 的 `WaterMarkProvider` 传固定 `color="rgba(0,0,0,0.15)"`，覆盖自动反色逻辑。
- **验证**：
  - `http://localhost:3010/?kb_id=45aadf70...`（测试库）→ 文档页有水印
  - `http://localhost:3010/?kb_id=6b77256d...`（妃妃）→ 欢迎页正常加载，有水印，不再 404
- **编译**：`cd web && npm run dev` 热重载即可
- **后续修复**：
  1. `homeProxy` 函数中误用未定义变量 `urlKbId`，改为正确参数 `kbId`
  2. `proxy()` 调用 `homeProxy` 时未传 `kbId` 参数，补充传递 `urlKbId`
- 原因：后端 `CaptchaController.redeem` 校验通过后立即删除 token，导致每次都要重新验证
- 修复：
  - 后端保留已验证 token，5 分钟内可复用
  - 前端 `useMathCaptcha.tsx` 将成功 token 写入 localStorage，5 分钟内直接复用
  - 挂件机器人 `views/widget/AiQaContent.tsx` 同样增加 token 缓存
- 修改文件：`backend-java/.../CaptchaController.kt`、`web/app/src/utils/useMathCaptcha.tsx`、`web/app/src/views/widget/AiQaContent.tsx`

### 简化 WIKI 站配置：隐藏 HTTPS、按钮直接打开 HTTP 地址
- 修改 `Header/index.tsx`、`Step7Complete.tsx`、`ConfigKB.tsx`、`CardBasicInfo.tsx`：优先用 `access_settings.hosts + ports` 拼 HTTP 地址，忽略 `base_url` 优先级
- 修改 `Step2Config.tsx`、`CardListen.tsx`：移除 HTTPS 端口、证书、私钥字段，只保留域名/IP 和 HTTP 端口
- 说明：HTTP 端口应填 App 前台实际运行端口（本地开发为 3010），表单只是登记地址，不会自动启动服务

### 简化门户网站设置页（毕设场景）
- 隐藏 `CardProxy`（前置反向代理）、`CardBasicInfo`（网址绝对路径前缀）、`CardQaCopyright`（智能问答版权信息）、`CardAuth`（访问认证）
- 原因：本地开发用不到反向代理；base_url 已和 HTTP 端口配置解耦；版权信息非核心；Java 后端暂未实现访问认证拦截，展示会误导用户
- 继续隐藏：目录设置、SEO 设置、自定义代码、统计设置，门户网站页只保留网站自定义、主题样式、服务监听方式

## 2026-08-20

### 讲解「统计-实时来访」模块链路（未改代码）
- 前端：Admin `RTVisitor.tsx` 请求 `GET /api/v1/stat/instant_count` 和 `/instant_pages`
- 后端：`StatController.kt` → `StatService.kt`，从 `stat_pages` 表聚合近 60 分钟数据和最近 10 条记录
- 埋点：App 前台 `home/page.tsx`、`views/node/index.tsx` 调用 `POST /share/v1/stat/page`，经 `proxy.ts` 生成/透传 `x-pw-session-id`
- 技术栈：React + Next.js + Spring Boot/Kotlin + JdbcTemplate + PostgreSQL；未用 Redis/NATS/WebSocket

### 修复 proxy.ts homeProxy 变量引用错误
- **现象**：妃妃知识库修复后 App 前台报错
- **根因**：`homeProxy` 函数中误用未定义变量 `urlKbId`（应为参数 `kbId`）；`proxy()` 调用 `homeProxy` 时未传 `kbId` 参数
- **修复**：
  1. `homeProxy` 内部 `getFirstNode(urlKbId)` / `getHomePath(urlKbId)` 改为 `getFirstNode(kbId)` / `getHomePath(kbId)`
  2. `proxy()` 调用 `homeProxy(request, headers, sessionId, appPathname)` 补充第五个参数 `urlKbId`
- **文件**：`web/app/src/proxy.ts`

### AI 问答复制按钮尊重 copy_setting 设置
- **现象**：Admin「安全设置 → 内容复制」设为「禁止复制」或「增加尾巴」时，AI 问答消息的复制按钮不受影响
- **根因**：`AiQaContent.tsx`（QaModal 版和 Widget 版）的复制按钮直接调用 `copyText(item.a)`，未检查 `copy_setting`
- **修复**：
  1. 导入 `ConstsCopySetting`
  2. `copy_setting === "disabled"` 时隐藏复制按钮
  3. `copy_setting === "append"` 时追加 `\n\n-----------------------------------------\n内容来自 {url}` 尾巴
- **文件**：`web/app/src/components/QaModal/AiQaContent.tsx`、`web/app/src/views/widget/AiQaContent.tsx`

### 实现 DFA 敏感词过滤（Java 后端）
- **背景**：Go 后端有完整的敏感词过滤链路（`DFA.go` + `block_word.go` + `chat.go`），Java 后端缺失此功能
- **新增文件**：
  1. `DfaFilter.kt`：DFA（确定性有限自动机）算法实现，支持 `init`（构建 Trie）、`check`（检查敏感词）、`filter`（替换敏感词为 `*`）
  2. `BlockWordService.kt`：从 `settings` 表读取 `key='block_words'` 的记录，启动时初始化所有知识库的 DFA，提供 `checkQuestion` / `filterAnswer` / `refreshDfa` 方法
- **修改文件**：`ChatController.kt`
  - `streamChat` 方法：用户问题发送前检查敏感词（包含则返回 error SSE 事件）；AI 回答发送前过滤敏感词
  - `completions` 方法：同样增加检查和过滤
- **敏感词存储**：复用 `settings` 表，`key='block_words'`，`value` 格式 `{"words": ["词1", "词2"]}`
- **编译**：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

### 修改 AI 问答复制按钮交互
- **变更**：`copy_setting === "disabled"` 时不再隐藏复制按钮，改为点击后弹出 `message.warning('当前状态下禁止复制')` 提示
- **原因**：用户期望看到复制按钮但被明确告知禁止，而非按钮消失
- **文件**：`web/app/src/components/QaModal/AiQaContent.tsx`、`web/app/src/views/widget/AiQaContent.tsx`

### 新增 BlockController（内容合规管理接口）
- **问题**：Admin「安全设置 → 内容合规」保存时调用 `POST /api/pro/v1/block`，Java 后端没有该接口，报 404
- **新增文件**：`backend-java/.../controller/BlockController.kt`
  - `GET /api/pro/v1/block?kb_id=xxx` → 返回 `{ words: string[] }`
  - `POST /api/pro/v1/block` → 请求体 `{ kb_id, block_words: string[] }` → 保存并刷新 DFA
- **修改文件**：`BlockWordService.kt` 新增 `saveBlockWords` 方法，写入 `settings` 表并实时刷新内存 DFA
- **编译**：`cd backend-java && .\gradlew.bat compileKotlin compileJava -q --no-daemon`

### 插入敏感词测试数据
- 向 `settings` 表插入测试知识库的 `block_words` 记录：`{"words": ["测试屏蔽词", "敏感词"]}`
- 需重启 Java 后端让 `@PostConstruct` 初始化 DFA

## 2026-08-20

### 排查水印不显示 + 妃妃无法访问
- **字段/请求均健康**：DB `apps.settings` 与 `GET /share/v1/app/web/info` 两个库都返回 `watermark_setting:"visible"`；SSR 页面完整渲染（之前误判 404，实为 Next.js 预加载的 not-found 边界）
- **水印根因**：`web/app/src/app/(pages)/(doc)/layout.tsx` 传的颜色 `rgba(0,0,0,0.15)` 自带 alpha，又被 canvas `globalAlpha=0.1` 二次压透明度 → 有效透明度 1.5%，肉眼不可见
  - 用 Edge CDP 实测解码水印 PNG：文字像素最大 alpha=4/255 ≈ 1.5%
  - 修复：`color` 改为 `rgba(0,0,0,1)`（不透明），让 opacity 0.1 生效 = 10% 黑字
- **妃妃无法访问根因**：Admin Header「访问 Wiki」按钮优先用 `hosts+ports` 拼 URL，妃妃配置 `ports=[85]`，但 wiki app 实际跑在 3010 → 打开 `http://localhost:85` 无服务
  - 修复：DB 更新妃妃 `access_settings.ports` 为 `[3010]`
  - 验证：`netstat` 确认 85 端口无服务，3010 正常

### 公开库水印访客溯源（外部方案）
- 需求：公开知识库无登录、无水印用户名，泄露截图无法溯源 → 让水印显示访客 ID
- **新增后端接口**：`ShareAuthController.kt` → `GET /share/pro/v1/auth/info`，读 `x-pw-session-id` 头，返回 `{ username: "访客"+sessionId末8位 }`（原来 404）
- **中间件注入**：`web/app/src/proxy.ts` 把生成的 `sessionId` 通过 `NextResponse.next({request:{headers}})` 注入 SSR 请求头（首次访问没 cookie 也能拿到），`proxyShare` 也转发该头
- **转发链路**：`getServerHeader.ts` 增加透传 `x-pw-session-id` 请求头 → SSR 请求直达后端时后端能读到
- **验证**：curl SSR 页面，RSC payload 中 `authInfo` 已返回 `"username":"访客3dea5fe4"`（sessionId 末8位）；CDP 确认水印 overlay 存在（756×488, z-index 9999）
- **溯源闭环**：水印显示访客ID + 时间戳 → 泄露截图 → 到 stat 表按 `session_id` 末8位反查 IP / UA / 轨迹
- 重启了 Java 后端（新 controller 生效），app 3010 由 dev 热更新自动加载
