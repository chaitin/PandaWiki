# 毕设可讲内容

## 方向三：统计/数据分析（运营视角）

- 价值：让 Wiki 系统具备"运营视角"，管理员可看访问趋势、热门内容、用户分布、问答来源，答辩时能现场展示数据可视化。
- 实现位置：Java 后端新增 `StatController` + `StatService`；Admin 前端复用现有 ECharts 统计看板；App/前台补访问日志埋点。
- 核心指标：
  - 访问次数（page_visit_count）：`stat_pages` 表按 kb_id + 时间窗口计数。
  - 问答次数（conversation_count）：`conversations` 表按 kb_id + 时间窗口计数。
  - 访问用户数（session_count）：`stat_pages.session_id` 去重。
  - 来源 IP 数（ip_count）：`stat_pages.ip` 去重。
- 可视化模块：
  - 实时来访：近 60 分钟每分钟访问量，补 0 填充缺失分钟。
  - 用户分布：中国地图热力图，按 IP 归属地聚合到省份。
  - 问答来源：饼图展示 Web/Widget/机器人等渠道分布。
  - 来源域名/热门文档/客户端（浏览器+OS）：Top10 排行。
  - 热门问题：本次新增维度，按 `conversation_messages` 中 role='user' 的内容精确匹配 Top10。
- 埋点机制：App 前台在欢迎页、文档详情页加载时调用 `POST /share/v1/stat/page`，携带 scene、node_id、session_id、UA、Referer；后端解析 UA 得到浏览器/OS，解析 IP 得到省份后入库。
- 答辩注意点：本地演示时 IP 会落在 127.0.0.1/私有网段，简易解析器将其映射到"北京"，确保地图有数据；真实生产环境可替换为 ip2region 等离线 IP 库。

## 一、系统架构

- 项目名称：PandaWiki —— 基于 AI 大模型的企业 Wiki 知识库系统（AI 问答 + 文档管理）
- 技术栈：Java（Spring Boot + JPA + Flyway，后端）/ React（Vite 管理端 + Next.js 用户端，前端）/ PostgreSQL / Docker
- 原版开源项目是 Go 后端，毕设改造为 Java 后端，前端代码基于原版 swagger 生成的接口客户端
- 毕设踩坑：Java 后端改造时容易遗漏前端依赖的字段，如 `knowledge_bases.perm`（当前用户对知识库的权限）。该字段缺失会导致前端 `Sidebar` 按权限过滤菜单时全部匹配失败，左侧只剩帮助文档/GitHub/在线支持，「文档」「统计」「设置」等入口消失
- 三个服务：Admin 后台（管理文档/配置模型，5173 端口）、App 前台（用户浏览/AI 问答，3010 端口）、Java 后端 API（8080 端口）
- 中间件全部容器化：PostgreSQL（5432）、Redis（6380）、NATS（4222，消息队列）、MinIO（9000，对象存储）

## 二、核心概念：知识库 / 目录 / 文档 三层结构

- 知识库（knowledge_bases 表）= 一个独立 Wiki 站点，可配置域名、Logo、机器人
- 目录（navs 表）= 文件夹，可多层嵌套，按 position 排序
- 文档（nodes 表）= 实际知识内容，属于某个目录，可设置权限/可见性
- 三者通过外键关联：navs.kb_id → knowledge_bases，nodes.kb_id + nav_id → navs
- 目录和文档可以重名：数据库无名字唯一约束，前端树靠 id 定位（产品设计）

## 三、知识库创建与模型配置的关系（重要，可讲）

- 知识库表结构没有模型字段——模型是**全局配置**（models 表按 type 唯一索引），与具体知识库解耦
- 创建知识库**不依赖模型**：POST /api/v1/knowledge_base 只插入 knowledge_bases 一条记录即可
- 前端"创建 Wiki 站"向导把模型配置放第 1 步，是因为首次使用系统时没有模型，问答功能无法运行，所以引导配置；但已有知识库时会自动跳过该步骤
- 模型配置的作用范围是 AI 能力：不配模型照样能创建知识库、浏览编辑文档、发布站点；只有 AI 问答/向量检索需要模型

## 四、RAG 问答原理（核心亮点）

- 问答 = 检索增强生成（RAG），需要 3 类模型协作：
  1. embedding（向量模型）：把文档和问题转成向量，检索相似内容（内置 bge-m3）
  2. rerank（重排序模型）：精排检索结果（内置 bge-reranker-v2-m3）
  3. chat（对话模型）：把问题+检索知识拼进提示词生成回答（如 deepseek-chat）
- 流程：用户提问 → 向量化 → 检索知识库 → 重排 → 生成回答
- 系统内置 embedding/rerank，通常只需配置 chat 模型即可跑问答

## 五、版本控制与 License 机制

- 开源 Open-Core 商业模式：同一套代码，通过 license 的 edition（版本号）控制功能开关
- 前端 constant/version.ts 存 4 套配置：免费版(edition=0)/专业版(1)/旗舰版(2)/企业版(3)
- 限制项：知识库数量(wikiCount)、文档数、管理员数等
- 毕设做法：修改 LicenseController 返回 edition=3（企业版）解锁限制，体现对授权机制的理解

## 六、多语言后端的技术要点

- 前端有两套请求封装：新封装 httpClient（兼容有/无 success 包装字段）、老封装 api/request（曾强制要求 success 字段）
- Java 后端统一返回原始 JSON（如 {"models":[...]}），通过前端拦截器兼容两种格式
- 排错经验：界面报"网络异常"但请求 200 → 先查响应拦截器对响应格式的解析逻辑

## 六.5、真实获取模型列表

- 真实获取模型列表
  - "获取模型列表"接口通过 OpenAI 兼容协议真实调用各平台：GET {base_url}/models + Authorization: Bearer {api_key}
  - 响应解析 data[].id → 模型名列表（如 deepseek-chat / deepseek-reasoner）
  - 支持 api_header 自定义鉴权头（形如 "X-API-Key: xxx"）
  - 错误通过 error 字段透传（如 401 鉴权失败），前端可显示具体原因，替代模糊的"网络异常"
- 模型连通性检测
  - `POST /api/v1/model/check`：配置模型时点击「检测」，后端根据 `type` 真实调用模型接口验证连通性
  - `chat`/`analysis`/`analysis-vl` 调 `POST /chat/completions`，`embedding` 调 `/embeddings`，`rerank` 调 `/rerank`
  - 成功返回 `content="检测成功"`，失败通过 `error` 字段返回 HTTP 状态码 + 响应片段，帮助用户定位配置错误


## 七、AI 模型调用服务设计

- 新增 `ModelService` 统一封装大模型调用，支持 chat/embedding/rerank 三类模型，全部走 OpenAI 兼容协议
- 模型配置全局唯一（models 表按 type 唯一索引），启动时按类型取 `is_active=true` 的模型
- chat：POST {base_url}/chat/completions，解析 choices[0].message.content
- embedding：POST {base_url}/embeddings，解析 data[0].embedding 为 FloatArray
- rerank：POST {base_url}/rerank，解析 results[].relevance_score
- 鉴权优先使用用户配置的 api_header（形如 X-API-Key: xxx），否则默认 Bearer {api_key}
- Kotlin 与 Java 混编时注意：`@JvmOverloads` 暴露默认参数，Java 调用 Map 时显式 cast 为 Object 以匹配 `Map<String, Any?>`

## 八、AI 接口实现

- App 前台 AI 问答：
  - `POST /share/v1/chat/search`：关键词检索知识库文档
  - `POST /share/v1/chat/completions`：RAG 问答，先检索相关文档，再把文档拼进 system prompt 生成回答
  - `POST /share/v1/chat/message`：**SSE 流式问答接口**，前端 `AiQaContent.tsx` 实际调用；后端用 `SseEmitter` 模拟流式，依次发送 `conversation_id`、`message_id`、`chunk_result`（检索引用）、`data`（回答内容片段）、`done`/`error` 事件
  - **SSE 踩坑**：发送 `error` 事件后必须用 `emitter.complete()` 正常关闭连接；若用 `completeWithError()` 会导致 Tomcat 异常断开，浏览器报 `ERR_INCOMPLETE_CHUNKED_ENCODING`，前端显示 network error
- Admin AI 摘要：`POST /api/v1/node/summary` 和 `/summary/stream`，调用 chat 模型为文档生成 30 字以内摘要并写入 meta
  - **SSE 踩坑**：Java 后端最初直接 `emitter.send(data(summaryText))` 发送纯文本，但前端 `fetch.ts` 使用 `responseMode: 'sse-json'`，要求每个 SSE 事件的 `data:` 后是 JSON（含 `type`/`content` 字段），否则 `JSON.parse` 失败、界面无内容；修复后统一包装为 `{"type":"data","content":"..."}`，与 RAG 问答接口格式保持一致
- Admin AI 续写：`POST /api/v1/creation/tab-complete`，根据前缀/后缀调用 chat 模型补全文本
- Admin/App AI 文本润色：`POST /api/v1/creation/text`，接收 `text` + `action`（rephrase/summary/extend/shorten），按不同 action 构造 prompt 调用 chat 模型；以 `text/event-stream` 分块返回，前端逐字显示润色/摘要/扩写/缩短结果
  - **字段踩坑**：Java 后端最初读 `prompt` 字段，但前端发送的是 `text` + `action`，导致后端拿到空 prompt、返回空内容；修复后字段对齐
  - **流式返回**：由于当前 `ModelService.chat()` 是同步调用返回完整字符串，后端通过固定长度（8 字符）+ 固定间隔（40ms）分块写入响应，模拟流式效果，兼顾实现简单与前端体验
- 节点详情：`GET /api/v1/node/detail?id=...` 读取单条文档/文件夹详情，供 Admin 编辑页使用
- 知识库发布：`POST /api/v1/knowledge_base/release` 将节点状态置为已发布，同时生成 `kb_releases`、`node_releases`、`kb_release_node_releases` 发布快照，支持历史版本回滚
- 发布历史：`GET /api/v1/knowledge_base/release/list?kb_id=...` 查询发布记录
- 当前 RAG 检索采用**向量检索（embedding 相似度）**为主、关键词 ILIKE 为降级，详见"十.5、向量检索实现"

## 十.5、向量检索实现（RAG 检索环节，答辩亮点）

- **为什么做向量检索**：关键词 `ILIKE '%整句问题%'` 要求文档内容连续包含完整问题，而文档里通常只有片段（如"谭玉妃"），导致检索为空 → AI 无上下文 → 幻觉
- **架构设计（轻量方案）**：不引入独立向量数据库，向量直接存 PostgreSQL 新表 `node_embeddings`（float8[] 数组类型），检索时在 Java 内存算**余弦相似度**取 top5
- **为什么不用 pgvector**：docker 的 PG 镜像是 `postgres:16-alpine`，不带 pgvector 扩展；毕设数据量小，全量内存计算毫秒级，无需扩展；后续数据量大可平滑替换为 pgvector/向量库（检索逻辑封装在 `EmbeddingService`，可扩展）
- **核心组件**：
  1. `EmbeddingService.kt`：`reindexKb`（全量向量化）/ `ensureIndexed`（懒加载，首次问答自动向量化）/ `search`（余弦相似度检索 top5）
  2. migration `V2__node_embeddings.sql`：建表 `node_embeddings(id, node_id, kb_id, chunk_index, chunk_text, embedding float8[])`
  3. `ModelService.embedding()`：调 OpenAI 兼容 `POST {base_url}/embeddings` 拿 FloatArray
- **检索流程**：用户问题 → embedding API 转问题向量 → 与该知识库全部文档向量算余弦相似度 → 排序取 top5 → 拼进 system prompt → chat 模型生成回答
- **降级设计**：embedding 模型未配置或调用失败时，`ChatController.searchNodes` catch 异常自动回退到关键词 ILIKE，保证问答始终可用
- **手动重建**：`POST /share/v1/chat/reindex`（带 x-kb-id）全量重建某知识库向量
- **余弦相似度公式**：`cos(a,b) = (a·b) / (|a|·|b|)`，值越接近 1 越相似；embedding 向量维度由模型决定（如 bge-m3 为 1024 维）
- **踩坑记录**：前端智能问答调用的是 SSE 流式接口 `/share/v1/chat/message`，最初后端只实现了普通 POST `/share/v1/chat/completions`，导致 404；新增 SSE 接口后智能问答流程打通

## 九、Widget 嵌入机器人（网页挂件）

- 功能：把 PandaWiki 的 AI 问答能力以一段 JS/CSS 代码嵌入到外部网站，外部页面出现悬浮球/按钮，点击弹出问答窗口
- Admin 配置入口：系统设置 → AI 机器人 → 网页挂件机器人，可配置按钮样式、位置、主题、推荐问题、免责声明等
- 保存配置：新增 `App` 实体 + `AppRepository` + `AppController`，实现 `GET /api/v1/app/detail` 和 `PUT /api/v1/app`，`settings` 字段以 jsonb 存 `widget_bot_settings`
- 公开接口：新增 `GET /share/v1/app/widget/info` 供嵌入脚本读取挂件配置；重写 `POST /share/v1/chat/widget` 为真实 SSE 流式 RAG 问答，复用 `/message` 的检索与模型调用逻辑，输出 `conversation_id`/`message_id`/`chunk_result`/`data`/`done`/`error` 事件
- 前端嵌入脚本 `widget-bot.js`：通过 `data-kb-id` 指定知识库、`data-api-domain` 指定后端地址；创建悬浮球/按钮，点击弹出 iframe 加载 `/widget` 页面；iframe URL 带 `kb_id` 参数，确保问答和搜索能命中正确知识库
- 跨域处理：Java 后端新增全局 CORS 配置，允许所有来源访问 `/share/**` 等公开接口，解决浏览器 `file://` 或不同域名下 `widget-bot.js` 拉取配置失败的问题
- **踩坑记录 1**：`widget-bot.js` 最初用脚本所在域名（App 前端 3010）请求 `widget/info`，但该接口在 Java 后端 8080，导致 403/404，悬浮球只能使用默认配置
- **修复 1**：脚本增加 `data-api-domain` 属性，强制向后端地址请求配置
- **踩坑记录 2**：Java 后端未配 CORS 时，浏览器对跨域 GET 先发 OPTIONS 预检，后端返回 403，`Failed to fetch`，配置同样读不到
- **修复 2**：新增 `CorsConfig.kt`，全局允许跨域预检和实际请求
- 测试方式：访问 `http://localhost:3010/test-widget.html` 可验证悬浮球位置、图标、主题等配置是否随 Admin 保存实时变化

## 九.5、App 前台验证码

- 智能问答、文档评论、文件上传等公开入口使用 `@cap.js/widget` + `go-cap` 做防机器人验证
- 协议：`POST /share/v1/captcha/challenge` 获取质询，`POST /share/v1/captcha/redeem` 提交解答换取 token
- 真实实现：
  - 后端 `CaptchaController`：challenge 生成两个 1~20 的随机整数相加，token 5 分钟有效且校验通过后立即移除防重放；redeem 校验答案，错误提示"答案错误，请重新验证"
  - 前端 `AiQaContent.tsx`：AI 问答流程不再用默认的 `@cap.js/widget` 弹窗，改为自定义 MUI Dialog 中文数学验证码弹窗（标题"安全验证"），答案错误自动刷新题目、最多重试 3 次
  - 用原生 fetch 直接请求验证码接口，绕过前端 httpClient 的统一包装，保证与 `@cap.js/widget` 的裸响应格式兼容
  - 防刷增强：连续 3 次答案错误后，前端写入 localStorage 锁定 5 分钟，倒计时结束后才能再次验证；锁定期间直接提示"验证失败次数过多，请 X分X秒 后重试"
  - UI 细节：去掉"为防止恶意请求"文案，算式数字用 22px/700/#fff 高亮，运算符用半透明白色
- 5 分钟过期原因：安全与体验的折中，限制 token 被滥用的时间窗口，又避免正常用户频繁验证
- 现场验证：浏览器实测 `http://localhost:3011/` 智能问答流程，弹窗能正常输入数字；错误答案自动刷新题目，连续 3 次错误后进入 5 分钟锁定并显示倒计时，正确答案后 SSE 流式返回答案
- 后续可讲：当前锁定存在前端 localStorage，可被清缓存绕过；生产环境应配合后端按 IP/会话限流，形成前后端双重防护
- **踩坑记录 1**：最初后端 `CaptchaController` 要求请求头必须带 `x-kb-id`，但 `@cap.js/widget` 作为第三方组件不会自动携带业务 header，导致 challenge 接口 500，前端提示"验证失效"且报错 `Cannot read properties of undefined (reading 'c')`
- **修复 1**：验证码本身与知识库无关，移除对 `x-kb-id` 的强制校验，让 challenge/redeem 都能正常响应
- **踩坑记录 2**：自定义弹窗最初复用前端 `httpClient`，但 `httpClient` 会自动取 `response.data`，而验证码接口返回的是裸 JSON（`{success, token, ...}`），导致前端拿到的 token 为 undefined，redeem 报 invalid token
- **修复 2**：验证码流程改走原生 fetch，直接解析后端返回的完整 JSON
- **踩坑记录 3**：手写 DOM 弹窗时输入框无法输入（可能被页面层级/全局样式影响）
- **修复 3**：改用 MUI Dialog 组件，由 MUI 统一管理焦点、遮罩和 z-index

## 十、文件上传方案

- 原版用 MinIO 对象存储；毕设简化为本地磁盘（backend-java/data/static），通过 /static-file/** 静态资源映射访问
- 上传接口：/api/v1/file/upload（multipart）、/upload/url（远程下载，禁重定向防 SSRF、限 50MB）、/upload/anydoc
- 安全措施：文件扩展名黑名单（exe/sh/jar 等）、路径穿越校验（../）

## 十一、模型调度：analysis / analysis-vl 与 CardAI 提示词（答辩可讲）

### 11.1 前端配置了 5 类模型，后端如何真正调度？

- 模型表 `models` 按 `type` 唯一索引，目前支持 `chat`、`embedding`、`rerank`、`analysis`、`analysis-vl`
- 之前 Java 后端只实现了 chat/embedding/rerank 三类调用，`analysis`（文档分析）和 `analysis-vl`（图像分析）虽然能在 Admin 配置，但没有任何后端流程使用
- 本次补齐：
  - `ModelService.chatByType(type, messages, ...)`：按类型取激活模型，未配置时可选降级到 chat 模型
  - `ModelService.analyzeDocument(content, prompt?)`：优先使用 analysis 模型做文档分析/提炼
  - `ModelService.analyzeImage(imageUrls, prompt?)`：优先使用 analysis-vl 视觉模型分析图片，未配置时降级到 chat 模型
  - `NodeController` 的 AI 摘要：从原来固定调用 chat 模型改为优先调用 analysis 模型，让 analysis 模型在真实业务中生效
- 新增公开接口：
  - `POST /api/v1/model/analyze`：文档分析入口
  - `POST /api/v1/model/analyze-image`：图像分析入口
- 模型调度原则：配置了就按类型用，没配就降级，保证功能不因为缺一个可选模型而挂掉

### 11.2 CardAI 提示词设置的 Java 后端落地

- 原 Go 后端专业版提供 `/api/pro/v1/prompt` 接口管理知识库提示词，切到 Java 后端后该接口缺失，Admin「设置 → 智能问答」页面保存提示词失效
- 本次实现：
  - 新增 `PromptService.kt`：读写 `settings` 表 `key='system_prompt'` 记录，字段包括 `content`（自定义问答提示词）、`summary_content`（自定义摘要提示词）、`enable_preset`（是否启用通用配置）及三个开关（自动语言、通用知识补充、显示引用来源）
  - 新增 `PromptController.kt`：实现 `GET /api/pro/v1/prompt?kb_id=xxx` 和 `PUT /api/pro/v1/prompt`，返回 `{success, code, message, data}` 兼容前端 httpClient 拦截器
  - 修改 `ChatController.kt`：RAG 问答构造 system prompt 时，优先读取知识库配置的 CardAI 提示词；启用通用配置时按开关组合生成预设提示词（含回答步骤、引用格式、注意事项），未配置时使用默认提示词
- 效果：Admin 里设置的自定义提示词或通用配置开关，会真正影响 App/Widget 的 AI 问答行为

### 11.3 答辩可说的点

- "模型调度不是只存配置，而是要在业务流里用起来"：analysis 模型接管文档摘要，analysis-vl 模型提供图像分析接口
- "提示词管理不是只保存文本，而是要在 RAG 的 system prompt 里生效"：知识库可独立配置回答风格、引用格式、摘要风格
- "降级设计保证可用性"：analysis/analysis-vl 未配置时自动回落到 chat 模型，毕设演示时不会因为模型没配全而报错

## 十二、文档导入（知识库内容来源，答辩高频考点）

- 价值定位：RAG 系统"怎么把文档喂给系统"是毕设最常见考点。知识库内容来源 = 导入功能，导入后文档进入 nodes 表，发布后走 embedding 向量化，才能被问答检索到。链路：**导入 → 解析 → 建节点 → 发布 → 向量化 → 检索**
- 三种导入来源：
  1. **本地文件导入**：multipart 上传（/api/v1/file/upload，限 50MB）→ 存本地磁盘 → 解析
  2. **URL 抓取导入**：直接填 URL，后端抓网页转 Markdown
  3. **飞书文档导入**：填飞书开放平台 App ID/Secret/User Access Token，拉取文档树批量导入

### 12.1 后端统一解析服务 DocumentParseService

- **Apache Tika 解析本地文件**：`AutoDetectParser` 自动识别文件类型（PDF/Word/Excel/PPT），`BodyContentHandler` 抽取纯文本；txt/md/html 直接读 UTF-8 免走 Tika
- **Jsoup + Flexmark 抓取 URL**：Jsoup 定位正文区域（优先 article → main → role=main → 常见 class 兜底），移除 script/style/nav/footer/广告噪声，再经 FlexmarkHtmlConverter 把 HTML 转成 Markdown（保留标题/链接/表格）
- **飞书开放平台 API**（三段式）：
  - 换取应用凭证：`POST /open-apis/auth/v3/app_access_token/internal`（app_id + app_secret）
  - 拉文档列表：文档搜索接口 / 知识空间 wiki 节点接口（分页 page_size）
  - 导出内容：docx `raw_content` 接口获取纯文本；旧版 doc 走 `document/content` 兜底
- **安全措施（可讲）**：URL 下载禁重定向（防 SSRF 内网探测）、限制 50MB、文件路径穿越校验（`../` 拒绝）
- **任务异步轮询设计**：export 返回 `task_id`，前端定时轮询 `/crawler/results` 直到 completed/failed；任务结果存内存 ConcurrentHashMap，30 分钟自动清理

### 12.2 接口设计与前端对齐

- 前端 AddDocByType 组件是原版 Go 的 swagger 客户端，后端按它的字段精确对齐：
  - `POST /api/v1/crawler/parse`：传 kb_id + crawler_source + key/feishu_setting → 返回文档树（DocsTree，含 value/children 递归结构）
  - `POST /api/v1/crawler/export`：传 id + doc_id + file_type → 返回 task_id
  - `GET /api/v1/crawler/result` / `POST /api/v1/crawler/results`：按 task_id 查内容
- **踩坑：飞书凭证传递**：前端 export 请求只带 doc_id 不带凭证，所以后端在 parse 阶段把 feishu_setting 缓存进内存，export 时按 parse 返回的 id 取回（30 分钟过期）
- **踩坑：Java/Kotlin 混编**：Lombok @Data 生成的 getter 对 Kotlin 编译期不可见，DTO 全部改用 Kotlin data class；且 Response DTO 字段要用 var（Java 端要 setXxx() 赋值）

### 12.3 答辩可说的点

- "三类来源共用一套解析-建库-向量化流水线"：本地文件（Tika）、网页（Jsoup+Flexmark）、飞书（开放平台 API）最终都归一成 Markdown/文本写入 nodes 表，体现抽象能力
- "导入安全"：SSRF 防护（禁重定向）、文件大小限制、路径穿越校验，体现安全意识
- "异步任务模式"：大文档导出不阻塞 HTTP 请求，返回 task_id 轮询，是常见的后台任务设计模式
- "容错"：飞书错误码透传给前端（如 invalid param），用户可自行修正凭证，而不是笼统的"导入失败"
