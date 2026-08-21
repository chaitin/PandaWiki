# 毕设可讲内容

## 十七、校园知识库品牌定制（毕设场景化改造）

### 17.1 为什么做品牌定制
- 原版 PandaWiki 是通用产品，毕设演示时用学校场景更有代入感，也能体现"我对项目做了定制化改造"
- 改造不涉及核心逻辑，属于前端静态资源 + 默认配置的替换，工作量小但视觉效果明显

### 17.2 改了哪些地方
1. **Logo 图片替换**（多处）：
   - `web/admin/src/assets/images/logo.png`、`login-logo.png` — Admin 侧边栏/登录页
   - `web/admin/public/logo.png` — Admin 浏览器标签页 favicon
   - `web/admin/public/images/init/icon.png`、`brand_logo.png` — 门户网站欢迎页图标/底部品牌
   - `web/app/public/favicon.png` — App 前台浏览器标签页图标
   - `web/app/src/assets/images/logo.png` — App 前台 header logo
   - 校徽需去掉白色背景，保存为透明 PNG（可用 remove.bg）
2. **默认配置改造**（`initData.ts`）：
   - 站点标题 → 湖工院知识库；品牌名/描述改为校园定位
   - Footer 链接 → 校园服务/学习资源/其他
   - Banner/轮播图/FAQ → 校园相关内容；主题色 → 校徽蓝（#1E5AA8）
3. **Admin 后台文字**：侧边栏/登录页标题统一改为「湖工院知识库」
4. **Logo 尺寸调整**：
   - Admin 侧边栏 30px → 48px、登录页 64px → 96px
   - App 前台 header 32px → 44px（`web/packages/ui/src/header/NavBtns.tsx` + `welcomeHeader/NavBtns.tsx`）
5. **版权信息**：`FooterConfig.tsx`「PandaWiki 版权信息」→「湖工院版权信息」
6. **帮助文档改造**：`Sidebar/index.tsx` 把「帮助文档」按钮从外链官网改为项目内弹窗，展示自家 7 大功能帮助说明（HELP_ITEMS 常量）

### 17.3 答辩可说的点
- "我把 PandaWiki 改造成了校园知识库场景，替换校徽、调整主题色、重写欢迎页内容，让它更贴合学校使用场景"
- "默认配置不是写死在后端数据库，而是前端 `initData.ts` 定义，创建知识库时通过 API 写入 `apps.settings` JSONB 字段——这种设计让不同场景的默认模板可灵活切换"
- "Logo 分布在不同文件分别服务 Admin 后台、登录页、门户网站、App 前台，体现多端品牌一致性"
- "帮助文档用常量数组驱动渲染，新增功能只需往数组加一项，易维护"

### 17.4 数据流向（可讲）
```
initData.ts（前端默认模板）
  ↓ 创建知识库时
PUT /api/v1/app 写入 apps.settings（JSONB）
  ↓ 管理员在设置页修改
CustomModal 可视化编辑器
  ↓ 保存
再次写入 apps.settings
  ↓ App 前台读取
GET /share/v1/app/web/info → 渲染欢迎页
```

### 17.5 Admin 帮助文档改造（外链 → 自家功能弹窗）
- 原版侧边栏「帮助文档」按钮直接 `window.open` 跳转 PandaWiki 官网文档（外网链接，本地无法访问且与毕设内容无关）
- 改造：点击改为打开项目内弹窗（MUI Modal），内容为 `HELP_ITEMS` 常量数组，展示本项目 7 大功能使用说明：知识库管理、文档管理、AI 智能问答、统计看板、模型配置、网页挂件机器人、反馈闭环
- 代码位置：`web/admin/src/components/Sidebar/index.tsx`

### 17.6 侧边栏底部按钮与在线支持改造
- 删除 GitHub 按钮（原跳转 PandaWiki 开源仓库），底部顺序改为：在线支持 → 帮助文档 → 版本信息
- 「在线支持」弹窗内容定制：
  - 左侧：原「企业微信交流群」→「学校公众号」，二维码图片替换为学校公众号二维码（`web/admin/src/assets/images/qrcode.png`）
  - 右侧：原「社区论坛」（跳百智云论坛）→「学校官网」，跳转 `https://www.hunangy.com/`，按钮配色改为校徽蓝渐变（#1E5AA8 → #2f7bd6）
- 答辩可讲点："品牌去魅"——删掉了所有指向 PandaWiki 官方（GitHub/论坛/官网）的入口，全部替换为学校资源，让系统完全本地化、场景化

---

## 附、App 前台交互实现（可讲点）

### App 前台为什么没有知识库切换

- Admin 后台是「管理多个 Wiki」的入口，所以有 `KBSelect` 下拉框切换知识库；App 前台是「某个 Wiki 的公开站点」，一个实例对应一个知识库
- App 通过 `x-kb-id` header / URL `?kb_id=` / `DEV_KB_ID` / 后端回退第一个 四种方式确定当前知识库
- 后端 `ShareController.webInfo` 根据 `x-kb-id` 返回 `base_url` 和 `settings`；`x-kb-id` 为空时回退到 `knowledge_bases` 表按 `created_at` 排序的第一个
- 每个知识库创建时可配置独立的 `access_settings.base_url`；Admin「访问 Wiki 网站」按钮就是打开当前知识库的独立站点
- 本地开发时 `start.cmd` 没设 `DEV_KB_ID`，所以 `http://localhost:3010` 始终显示最早创建的知识库；可通过在 `web/app/.env.local` 设置 `DEV_KB_ID=xxx` 固定指定，或用 `?kb_id=xxx` 临时切换
- 这种设计是常见的多租户/多站点模式：后台统一管，前台按域名/路径隔离

### 欢迎页为什么是动态配置的

- App 前台欢迎页不是硬编码 HTML，而是 Admin 后台「站点设置 → 落地页配置」里拖拽/配置的组件数组
- 前端读取 `kbDetail.settings.web_app_landing_configs`，按 `type` 映射到 `Banner`、`BasicDoc`、`DirDoc`、`Carousel`、`Faq` 等 UI 组件动态渲染
- 这种设计让运营人员不用写代码就能搭建首页；如果未配置，页面就只有顶栏和页脚，看起来「没有欢迎界面」
- 代码位置：`web/app/src/views/home/index.tsx` 的 `componentMap` 与 `handleComponentProps`

### App 前台如何显示 Admin 里的文档

- **Admin 编辑保存**：`web/admin/src/pages/document/editor/edit/Wrap.tsx` 调用 `PUT /api/v1/node`，把标题、内容、摘要、emoji、目录等写入 `nodes` 表
- **发布知识库**：Admin「发布」页调用 `POST /api/v1/knowledge_base/release`，后端生成 `kb_releases`/`node_releases` 快照，并把 `nodes.status` 改为 2（已发布），同时触发向量化写入 `node_embeddings`
- **App 读目录树**：打开 `localhost:3010` 时，Next.js 中间件 `proxy.ts` 调用 `GET /share/v1/node/list`，后端按知识库返回目录分组后的节点列表，中间件找到第一个文档并重写到 `/node/xxx`
- **App 读单篇内容**：`web/app/src/app/(pages)/(doc)/node/[id]/page.tsx` 服务端调用 `GET /share/v1/node/detail?id=xxx`，后端从 `nodes` 表取 `name`/`content`/`meta`/`permissions` 等
- **前端渲染**：`views/node/index.tsx` 用 `useTiptap` 以只读模式渲染 `content`；`type=1` 是文件夹、`type=2` 是文档
- **注意**：当前 Java 后端直接读 `nodes` 表供 App 展示，没有读发布快照表，所以保存/发布后的内容能实时体现在前台

### App 前台如何显示「内容摘要」

- **生成摘要**：Admin 文档管理页点击「AI 生成摘要」，后端调用大模型把结果写入 `nodes.meta.summary`
- **读取摘要**：App 前台 `views/node/DocContent.tsx` 拿到 `node.detail` 后，判断 `info.meta.summary` 是否存在
- **展示位置**：有摘要时，在文档正文上方渲染一个「内容摘要」卡片，用户打开文档就能看到一句话总结
- **数据存储**：摘要本质上是普通文本，存在 `nodes` 表的 JSON 字段 `meta` 里

### 智能问答的人机验证流程

- **触发时机**：用户点击发送后，`AiQaContent.tsx` 的 `chatAnswer` 先 `await requestCaptcha()`，拿到 token 才继续请求 AI；图片上传前也调验证码
- **弹窗实现**：`utils/useMathCaptcha.tsx` 自定义 Hook，用 MUI Dialog 渲染「安全验证」弹窗，返回 `dialog` 和 `requestCaptcha`（Promise）
- **后端出题**：`POST /share/v1/captcha/challenge` 生成真实数学题（两个 1~20 整数相加），把 token、答案、过期时间存内存 `ConcurrentHashMap`，5 分钟过期
- **答案校验**：`POST /share/v1/captcha/redeem` 提交 token 和答案，后端校验通过后保留 token（演示场景允许 5 分钟内复用）
- **前端缓存**：`useMathCaptcha.tsx` 把成功返回的 token 和过期时间写入 `localStorage`，5 分钟内再次提问直接复用，不再弹窗
- **继续问答**：验证通过后 Promise resolve 返回 token，`chatAnswer` 将其作为 `captcha_token` 放入 `POST /share/v1/chat/message` 请求体
- **防刷锁定**：连续答错 3 次，前端写入 localStorage 锁定 5 分钟，弹窗显示倒计时并隐藏输入框
- **挂件机器人复用**：`views/widget/AiQaContent.tsx` 同样读取本地缓存 token，避免每次打开挂件都验证
- **为什么用原生 fetch**：验证码接口返回裸 JSON，项目统一 `httpClient` 会自动取 `response.data`，早期导致 token 为 undefined，所以验证码流程改走原生 fetch 直接解析完整响应

### Ctrl+K 智能问答弹窗的完整链路

- **快捷键监听**：UI 组件库 `web/packages/ui/src/header/index.tsx` 里全局监听 `keydown`，Mac 是 ⌘K，Windows/Linux 是 Ctrl+K
- **状态管理**：快捷键触发 `onQaClick`，App 的顶栏把它绑定到全局状态 `setQaModalOpen(true)`（`provider/index.tsx`）
- **弹窗组件**：`web/app/src/components/QaModal/index.tsx` 用 MUI Modal 实现，内部两个 Tab：「智能问答」和「仅搜索文档」
- **智能问答请求**：`AiQaContent.tsx` 先弹数学验证码，验证通过后通过 SSE 流式请求 `POST /share/v1/chat/message`
- **SSE 事件解析**：后端依次发送 `conversation_id`、`message_id`、`chunk_result`（检索引用）、`data`（回答片段）、`done`/`error`；前端逐段追加到聊天列表，实现打字机效果
- **仅搜索文档**：走 `POST /share/v1/chat/search`，只检索不生成回答
- 这个链路体现了「前端事件驱动 + 全局状态 + SSE 流式 + RAG 检索」的完整交互设计

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

## 八.5、反馈闭环：问答评价 + 文档评论（运营与质量迭代）

- **价值**：RAG 系统不是一次性工程，需要收集用户反馈持续优化；本系统实现了"前台反馈 → 后台统计 → 管理员处置"的完整闭环，毕设演示时可展示真实数据。
- **前台 AI 问答评价**：
  - 接口：`POST /share/v1/chat/feedback`（message_id + score + type + feedback_content）
  - 场景：用户对 AI 回答点 👍/👎，踩时可选原因标签并填写补充意见
  - 后端限制：同一条消息只能投一次票，防止刷票
- **前台文档评论**：
  - 接口：`POST /share/v1/comment`、`GET /share/v1/comment/list`
  - 场景：文档底部开启评论区，访客提交评论；若开启审核，评论先进入待审状态，审核通过后前台才显示
  - 校验：提交前需通过数学验证码，防止机器人灌评论
- **后台管理入口**：Admin 左侧「反馈」菜单，两个 Tab：
  - **AI 问答评价**：`GET /api/v1/conversation/message/list`，列出所有被点赞/点踩的问答，显示问题、回答、反馈类型、来源 IP、时间
  - **文档评论管理**：`GET /api/v1/comment`，支持按 待审核/已通过/已拒绝 筛选，提供通过、拒绝、删除操作（`POST /api/pro/v1/comment_moderate`、`DELETE /api/v1/comment/list`）
- **数据落盘**：
  - 评价结果存在 `conversation_messages.info` JSONB 字段（`score`、`feedback_type`、`feedback_content`）
  - 评论存在 `comments` 表（`kb_id`、`node_id`、`content`、`status`、`info`、`pic_urls`）
- **实现要点**：
  - 流式问答接口 `/share/v1/chat/message` 在返回 `message_id` 的同时，把会话、用户问题、助手回答写入 `conversations`/`conversation_messages`，保证后续反馈有数据可关联
  - Admin 评价列表用 SQL `LATERAL JOIN` 取出每条助手消息前一条用户问题，作为"问题"字段展示
  - 评论开关从 `apps.settings.web_app_comment_settings` 读取，与 Go 后端存储结构保持一致
- **答辩可讲**："我不仅做了 AI 问答，还做了反馈闭环——用户可以对答案投票、对文档评论，管理员在后台能看到统计并审核评论，这是 RAG 系统持续优化的关键。"

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

### 11.4 真实踩坑：源码改了但运行包没更新

- **现象**：Admin「设置 → 问答设置」里填写「智能摘要提示词」，保存成功，但切换 Tab 再回来后文本框变空白
- **排查过程**：
  1. 先看前端 `web/admin/src/pages/setting/component/CardAI.tsx`，确认保存时会带 `summary_content` 字段，回显时也会读 `res.summary_content`
  2. 再看后端源码 `PromptController.kt` 和 `PromptService.kt`，确认已经实现 `summary_content` 的读写
  3. 直接调接口 `GET /api/pro/v1/prompt` 发现响应里没有 `summary_content` 字段
  4. 检查 JAR 包构建时间：`build/libs/panda-wiki-api-2.11.1.jar` 是 8/13 编译的，而 `PromptController.kt`/`PromptService.kt` 是 8/17 才加入 `summary_content` 的
- **根因**：Java 后端改了源码但没有重新打包/重启，运行中的进程还是旧的 class 文件，自然不认识新字段
- **解决**：重新执行 `./gradlew.bat bootJar -x test` 生成新 JAR，停止旧进程后重新启动
- **可讲点**：这是典型的「代码层面已修复，但运行环境没同步」问题；答辩时可以强调：源码正确不等于线上生效，必须验证构建产物和运行进程是否一致；排错时要会看日志、看接口响应、看文件修改时间/构建时间
- **二次踩坑**：重新启动后中文提示词显示成 `???`，排查发现是测试恢复数据时用了 PowerShell 命令行直接传中文，终端编码把中文转成了问号字节写入数据库；生产环境/测试环境都要注意请求体编码，Spring Boot 已在 `application.yml` 配置 `force-request=true` 强制 UTF-8，但客户端传参也必须保证 UTF-8

## 十三、OAuth2 / 短信 / 微信扫码登录设计（待实现）

### 13.1 为什么做多种登录

- 原版 PandaWiki Admin 后台只有账号密码登录，企业场景下用户更习惯扫码或手机号
- 毕设目标：在 Java 后端补齐「账号密码 + 微信扫码 + 手机号验证码」三种登录方式，三端共存
- 设计原则：**不替换 admin/admin123**，而是新增入口；首次扫码/手机登录默认创建普通用户，admin 可在后台绑定第三方账号

### 13.2 SSO vs OAuth2 vs 短信登录的区别

- **SSO（单点登录）**：一次登录，访问多个系统；企业内部常用 CAS/LDAP/SAML/OIDC
- **OAuth2**：授权协议，让第三方应用代表用户访问资源；社交登录（微信/QQ）本质用它
- **短信登录**：不依赖第三方 OAuth，用 SMS 验证码证明手机号归属，需要短信服务商
- 关系：OAuth2 是实现 SSO 的一种技术手段；微信扫码登录 = OAuth2 + 二维码

### 13.3 三种登录的完整链路

1. **账号密码**：保留现有 `POST /api/v1/user/login`，bcrypt 校验 → JWT
2. **微信扫码**：
   - 前端请求 `GET /api/v1/auth/wechat/authorize` 拿授权 URL
   - 用户微信扫码确认 → 微信回调 `GET /api/v1/auth/wechat/callback?code=xxx&state=xxx`
   - 后端用 code 换 access_token → 拉取 union_id/open_id/头像昵称 → 匹配或创建用户 → 返回 JWT
3. **手机号验证码**：
   - 前端 `POST /api/v1/auth/sms/send { phone }` 请求验证码
   - 后端生成 6 位码，存 Redis 5 分钟，mock 模式直接返回
   - 前端 `POST /api/v1/auth/sms/login { phone, code }` → 校验 → 匹配或创建用户 → JWT

### 13.4 安全设计

- **state 参数**：微信授权时生成随机 state 存 Redis，回调时校验，防 CSRF
- **短信防刷**：同一手机号 60 秒内不能重发、24 小时最多 10 条
- **验证码一次性**：校验成功后立即从 Redis 删除，防重放
- **JWT 续期**：三种登录最终都走同一 JWT 签发逻辑，权限体系不变

### 13.5 数据库变更

- `users` 表新增字段：`phone`、`phone_verified`、`wechat_union_id`、`wechat_open_id`、`wechat_info`
- 对 `phone` 和 `wechat_union_id` 加部分唯一索引（NULL 值不参与唯一约束）
- Redis 用于临时存储：短信验证码、OAuth state

### 13.6 本地调试策略

- 微信扫码：申请测试号/配置回调域较麻烦，毕设开启 `panda.auth.wechat.mock=true`，回调直接返回模拟用户信息
- 短信登录：开启 `panda.auth.sms.mock=true`，验证码直接返给前端，不调用真实短信商
- 答辩时：演示手机号登录最稳；微信扫码可用 mock 数据跑通完整回调链路

### 13.7 答辩可说的点

- "三端登录共用同一 JWT 签发和权限体系，保证用户角色一致"
- "微信登录严格按 OAuth2 标准：授权 → code → access_token → user_info"
- "短信登录做了完整的防刷和一次性校验，生产环境只需替换 SMS SDK"
- "设计了 Provider 抽象，后续加 QQ/钉钉/企业微信只需新增一个 Provider 实现"

### 13.8 为什么 Admin 后台没有「注册」功能

- PandaWiki 分两套入口：
  - **Admin 后台（5173）**：给管理员/运营人员用，管理知识库、文档、模型、成员
  - **App 前台（3010）**：给普通员工/访客用，浏览文档、AI 问答
- Admin 后台的设计理念是「管理员创建账号」，不允许普通用户自助注册；新管理员只能由现有 admin 在「用户管理」里创建
- 普通员工想看知识库，应该访问 **App 前台**，而不是申请 Admin 账号
- App 前台当前 Java 后端直接暴露内容，尚未实现访问控制；原版 Go 后端支持「无认证 / 简单口令 / GitHub OAuth / 企业认证（钉钉/飞书/企微/LDAP/CAS）」五种访问模式

### 13.9 企业场景下的账号体系

- **内部员工访问知识库**：走 App 前台，由知识库配置访问模式
  - 最简：公开访问（无认证）
  - 稍严：简单口令（一个密码分享给大家）
  - 企业：钉钉/飞书/企微/LDAP 扫码或账号登录（自动同步组织架构）
- **管理员/运营人员**：走 Admin 后台，使用账号密码或后续扩展的微信/手机号登录
- 当前 Java 后端 App 前台缺少认证拦截，属于后续需要补齐的部分；毕设若只做 Admin 登录扩展，App 前台仍保持公开访问即可演示

## 十四、管理员角色与权限模型（答辩可讲）

### 14.1 超级管理员 vs 普通管理员

- 用户表 `users.role` 只有两种取值：`admin`（超级管理员）和 `user`（普通管理员）
- 超级管理员可创建/删除管理员、不受知识库权限限制、能修改系统设置；普通管理员只能管理被分配权限的知识库
- 免费版最多只允许 1 个 `admin`，专业版/商业版前端限制分别为 20 / 50 个
- 内置账号 `admin/admin123` 是种子超级管理员，不能删除，也不能通过「重置密码」接口修改自己的密码
- 代码位置：`backend-java/src/main/java/com/chaitin/pandawiki/controller/UserController.java` 中 `MAX_ADMIN = 1`

### 14.2 知识库级权限设计

- 三个权限值存在 `kb_users.perm` 字段，是**知识库级别**的权限：
  - `full_control`（完全控制）：最高权限，可改 Wiki 站配置、管理知识库成员、发布、系统设置
  - `doc_manage`（文档管理）：可编辑文档/目录、发布内容
  - `data_operate`（数据运营）：可查看统计、问答记录、评论反馈
- 超级管理员自动拥有 `full_control`
- 前端 `Sidebar` 根据当前知识库返回的 `perm` 过滤菜单，没有对应权限的菜单不显示
- 当前 Java 后端只做了简单映射（admin → full_control，其他 → 空字符串），接口级强制校验是后续可完善点
- 代码位置：`web/admin/src/components/Sidebar/index.tsx`、`backend-java/.../KnowledgeBaseController.java`

### 14.3 「访问 WIKI 网站」按钮

- Admin 后台是「管理多个 Wiki」的入口，App 前台是「某个 Wiki 的公开站点」
- 按钮优先根据 `access_settings.hosts + ports` 拼出 `http://host:port`，不再被 `base_url` 抢优先级
- 多知识库通过不同访问地址隔离，体现多租户/多站点设计
- 本地开发时，HTTP 端口应填写 App 前台实际运行端口（默认 3010），这样点击按钮才能正确打开前台页面

### 14.4 复制用户信息与安全上下文

- 点击「复制用户信息」调用 `navigator.clipboard.writeText()`
- 浏览器要求页面处于 Secure Context：`https://` 或 `http://localhost`、`http://127.0.0.1`
- 普通 IP/域名的 `http://` 不满足条件，前端直接拦截提示「非 https 协议下不支持复制」
- 本地调试建议用 `localhost:5173`，不要用 `192.168.x.x`

### 14.5 Wiki 站配置表单字段（已简化，仅本地调试）

- 所有字段最终存入 `knowledge_bases.access_settings`（PostgreSQL jsonb）
- 名称：Wiki 站名称
- 域名或 IP：对应 `access_settings.hosts[0]`，本地开发填 `localhost`
- HTTP 端口：对应 `access_settings.ports[0]`，本地开发填 App 前台实际端口 `3010`
- 表单只是「登记地址」，不会自动启动服务；它告诉系统「这个 Wiki 对外访问地址是什么」
- 本地调试已隐藏 HTTPS 端口、证书、私钥字段，降低配置复杂度
- 毕设场景进一步隐藏了前置反向代理、网址绝对路径前缀、智能问答版权信息、访问认证、左侧目录导航、SEO、自定义代码、统计分析卡片。这些功能要么本地用不到，要么属于非核心展示项，简化后不影响主体功能演示

### 14.6 答辩可说的点

- 「两层权限模型」：全局角色（users.role）+ 知识库权限（kb_users.perm），兼顾系统管理和业务隔离
- 「免费版限制」：通过 `MAX_ADMIN` 和前端 License 版本控制功能边界，体现 Open-Core 商业模式
- 「安全上下文」：复制功能受限是浏览器安全策略，不是 bug，答辩时能解释清楚
- 「Wiki 站配置」：一个知识库可独立配置域名、端口，体现多站点部署能力；本地调试简化为只填 HTTP，避免 HTTPS 证书概念干扰

### 14.7 第一次如何登录（没有注册入口）

- 系统没有「注册」功能，首次使用直接拿 Flyway 迁移预置的账号登录
- 默认超级管理员：`admin / admin123`
- 预置逻辑：`V2__seed_default_admin.sql` 在项目启动时向 `users` 表插入一条 `role='admin'` 记录
- 登录接口：`POST /api/v1/user/login`，成功返回 JWT token
- 登录后可在 Admin「用户管理」里创建其他管理员或普通管理员
- **注意**：`UserController.reset_password` 禁止修改内置 `admin` 账号自己的密码，提示语提到改 `.env` 文件，但当前代码并未真正实现读取 `.env` 的 ADMIN_PASSWORD；如需改密目前只能直接更新数据库

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

## SSR 路由 kb_id 传递修复（妃妃知识库 404 根因与修复）

- **背景**：App 前台通过 `?kb_id=xxx` 区分知识库。Admin「访问 Wiki 网站」按钮生成带 `kb_id` 的 URL。
- **问题**：妃妃知识库访问任何页面直接"页面无法加载"（404），测试知识库正常。
- **根因**：SSR 阶段（`proxy.ts`、`app/layout.tsx` 等服务端组件）调用 `getShareV1AppWebInfo()` 无参，`getServerHeader()` 只读 `x-kb-id` header + `DEV_KB_ID`，**不读 URL `?kb_id=` 参数**。
  - 访问 `/?kb_id=妃妃` 时，SSR 拿不到 `kb_id` → 回退 `created_at` 最早 = 测试知识库 → 渲染测试库配置（home_page_setting=doc → rewrite 到 `/node/测试第一个node`）。
  - 浏览器 URL 仍带 `?kb_id=妃妃`，客户端 `httpClient` 从 `window.location.search` 读 `kb_id` 加 header → 请求 node detail → 妃妃里没有测试库那个 node → **404**。
  - 测试知识库正常是因为回退库恰好就是它自己，SSR/CSR 一致。
- **修复方案**：
  1. `getServerHeader.ts`：从 proxy 设置的 `x-current-search` header 解析 `kb_id`（优先级：参数 > `x-kb-id` header > `x-current-search` 解析 > `DEV_KB_ID`）。
  2. `proxy.ts`：显式从 `url.searchParams.get('kb_id')` 读取，传给 `getShareV1AppWebInfo({ headers })`、`getFirstNode(kbId)`、`getHomePath(kbId)`；`proxyShare` 也传 `urlKbId`。
  3. 修复 `homeProxy` 中误用未定义变量 `urlKbId`，改为正确参数 `kbId`。
  4. 修复 `proxy()` 调用 `homeProxy` 时未传 `kbId` 参数，补充传递 `urlKbId`。
- **效果**：任意知识库点击"访问 Wiki 网站" → 带 `?kb_id` → SSR 正确读取 → 渲染对应知识库 → 客户端与 SSR 一致，不再 404。

## 统一水印颜色

- **问题**：水印颜色基于 `#app-theme-root` 背景自动反色，不同知识库/页面背景不同时颜色变化，视觉不稳定。
- **修复**：`web/app/src/app/(pages)/(doc)/layout.tsx` 的 `WaterMarkProvider` 传固定 `color="rgba(0,0,0,0.15)"`，覆盖自动反色逻辑，所有页面水印统一为黑色半透明。

## 十五、实时来访模块数据链路（答辩专项）

### 15.1 模块定位

- 实时来访是 Admin 统计看板最顶部的模块，展示近 60 分钟每分钟访问量折线图 + 最近 10 条访问记录列表。
- 它是整个统计系统的数据来源基础，理解了它，就理解了埋点 → 入库 → 聚合 → 展示的全链路。

### 15.2 数据从哪来

- **不是 WebSocket/SSE 推送，也不是日志采集，而是前端 HTTP 埋点**。
- App 前台两个页面会触发埋点：
  - 欢迎页：`web/app/src/app/(pages)/(doc)/home/page.tsx`，scene = 1
  - 文档详情页：`web/app/src/views/node/index.tsx`，scene = 2
- 埋点方法：`postShareV1StatPage({ scene, node_id? })` → `POST /share/v1/stat/page`

### 15.3 请求里带了什么

- `x-kb-id`：当前知识库 ID
- `x-pw-session-id`：会话 ID，由 `web/app/src/proxy.ts` 中间件生成/复用
- `Authorization`：已登录用户 token（未登录可空）
- `X-Forwarded-For` / `X-Real-IP`：客户端 IP
- `User-Agent`：浏览器、操作系统
- `Referer`：来源页面

### 15.4 后端怎么处理

- `StatController.recordPage` 提取上述字段。
- `StatService.recordPage` 用 Hutool 的 `UserAgentUtil` 解析浏览器名和操作系统，解析 Referer 域名。
- 最终 `INSERT INTO stat_pages(...)`，字段包括 `kb_id`、`node_id`、`user_id`、`session_id`、`scene`、`ip`、`ua`、`browser_name`、`browser_os`、`referer`、`referer_host`、`created_at`。

### 15.5 Admin 怎么查出来展示

- 组件：`web/admin/src/pages/stat/Statistic/RTVisitor.tsx`
- 请求：
  - `GET /api/v1/stat/instant_count`：近 60 分钟按分钟聚合访问量，缺失分钟补 0
  - `GET /api/v1/stat/instant_pages`：最近 10 条访问记录，联表 `nodes`/`users`，IP 映射归属地
- 后端：`StatController.kt` → `StatService.kt` → PostgreSQL `stat_pages` 表

### 15.6 完整数据流（答辩时可画图）

```
用户访问 App 前台页面
  ↓
home/page.tsx / views/node/index.tsx 调用 postShareV1StatPage
  ↓
POST /share/v1/stat/page（带 x-kb-id、x-pw-session-id、UA、Referer、IP）
  ↓
StatController.recordPage 提取字段
  ↓
StatService.recordPage 解析 UA、Referer
  ↓
写入 PostgreSQL stat_pages 表
  ↓
管理员打开 Admin 统计页
  ↓
RTVisitor.tsx 请求 instant_count + instant_pages
  ↓
StatService 聚合查询
  ↓
前端渲染折线图 + 最近访问列表
```

### 15.7 技术栈

- 前台：Next.js 14 + React + TypeScript
- 后台管理：React 18 + TypeScript + Vite + MUI + ECharts
- 后端：Spring Boot + Kotlin + JdbcTemplate
- 数据库：PostgreSQL + Flyway
- 工具库：Hutool（UA 解析）
- 未使用：Redis、NATS、WebSocket

### 15.8 注意点

- 当前实现是"进入页面时请求一次"，严格来说是**准实时**，不是真正的实时推送。
- 如果要做到真正实时，可以在 `RTVisitor.tsx` 里加 `setInterval` 轮询，或改用 SSE/WebSocket。
- 本地演示时 IP 通常是 `127.0.0.1` 或内网地址，后端简易解析会映射到"北京"，确保地图有数据；真实生产可替换为 ip2region 离线库。

### 15.9 答辩可讲点

- "实时来访的数据来自前台埋点，不是后端凭空生成，也不是直接读服务器日志。"
- "我设计了 `scene` 字段区分欢迎页/文档页/问答页/登录页，方便后续按场景分析。"
- "用 `session_id` 做会话归并，能区分访问次数和访问用户数。"
- "解析 UA 得到浏览器和操作系统，解析 IP 得到省份，为地图和客户端分布提供数据。"
- "当前是轻量实现，直接落 PostgreSQL；数据量大后可以分流到 ClickHouse/Elasticsearch，实时性可以升级为 SSE 推送。"

### 15.10 前端技术栈说明（答辩万一被问到）

- **React 18**：Facebook 开发的组件化 UI 库，用虚拟 DOM 提高渲染效率，生态最大，招聘/维护成本最低。
- **TypeScript**：在 JavaScript 上加静态类型，大项目里能减少运行时错误、提升 IDE 提示和重构能力。
- **Vite**：前端构建工具，开发时启动快、热更新（HMR）快，打包基于 Rollup，比传统 webpack 更轻量。
- **MUI（Material-UI）**：基于 Google Material Design 的 React 组件库，提供按钮、表格、弹窗、布局等现成组件，省去大量 CSS 手写工作。
- **ECharts**：百度开源的可视化图表库，折线图、饼图、地图都能做，配置灵活，Admin 统计页的中国地图、来源域名 -
排行、客户端饼图都靠它。
- **BarTrend**：项目里对 ECharts 折线图的二次封装组件，统一配色、加载状态、响应式尺寸，统计页多个卡片复用。

**为什么选这套**：Admin 是数据型后台，需要快速搭建界面 + 大量图表，React+MUI+ECharts 是最成熟的组合；TypeScript 保证代码质量；Vite 提升开发体验。答辩时可以强调"技术选型偏向成熟稳定、生态丰富、适合中后台数据可视化"。

## 十六、内容安全：复制控制与敏感词过滤

### 16.1 内容复制控制

- **Admin 配置**：「安全设置 → 内容复制」三选一：不做限制 / 增加尾巴 / 禁止复制
- **存储位置**：`knowledge_bases.settings.copy_setting`，值为 `""` / `"append"` / `"disabled"`
- **前端实现**：文档页 `views/node/index.tsx` 调用 `useCopy` hook，根据 `copy_setting` 控制复制行为
- **AI 问答区域**：原先 `AiQaContent.tsx` 的复制按钮用 `copyText(item.a)` 直接复制，不受 `copy_setting` 影响
- **修复**：两个 AiQaContent 版本（QaModal + Widget）都加了 `copy_setting` 检查：
  - `"disabled"` → 隐藏复制按钮
  - `"append"` → 复制时追加来源 URL 尾巴
  - `""` → 正常复制

### 16.2 敏感词过滤（DFA 算法）

- **背景**：企业知识库需要过滤敏感词，防止 AI 回答中出现不当内容
- **DFA 原理**：确定性有限自动机，把所有敏感词构建成 Trie 树，一次遍历即可匹配所有敏感词，时间复杂度 O(n)
- **Go 后端已有**：`backend/utils/DFA.go` 实现了 Trie 树 + `Check`/`Filter` 方法，`backend/usecase/chat.go` 在问答流程中调用
- **Java 后端补齐**：
  - `DfaFilter.kt`：DFA 算法实现，支持 `init`（构建 Trie）、`check`（检查）、`filter`（替换为 `*`）
  - `BlockWordService.kt`：从 `settings` 表读取 `key='block_words'` 的记录，启动时初始化所有 DFA
  - `ChatController.kt`：`streamChat` 和 `completions` 方法都增加了检查和过滤
- **敏感词存储**：`settings` 表，`key='block_words'`，`value` 格式 `{"words": ["词1", "词2"]}`
- **问答流程**：
  1. 用户提问 → `checkQuestion` → 包含敏感词则返回错误提示
  2. AI 回答 → `filterAnswer` → 替换敏感词为 `*` 再返回给前端

### 16.3 答辩要点

- "内容安全是企业级知识库的核心需求，复制控制保护知识产权，敏感词过滤防止不当内容传播。"
- "DFA 算法比正则表达式更高效，一次遍历就能匹配所有敏感词，适合实时问答场景。"
- "敏感词列表存在数据库里，管理员可以动态增删改，不需要重启服务。"

### 16.4 显性水印显示问题排查（教训）

- **现象**：保存显性水印后，打开 Wiki 站看不到水印
- **排查过程**：
  1. 先查数据库 `apps.settings` → `watermark_setting:"visible"` ✅
  2. 再调接口 `GET /share/v1/app/web/info` → 返回 `visible` ✅
  3. SSR 页面也完整渲染（曾误判为 404，实际是 Next.js 预加载的 not-found 边界干扰判断）
  4. 用 Edge CDP 无头浏览器读真实 DOM → 水印 overlay 其实渲染了，尺寸铺满全页，background-image 也有
  5. **关键一步**：把水印 PNG base64 解码，读像素 alpha → 文字最大 alpha=4/255 ≈ 1.5%
- **根因**：`WaterMarkProvider` 传的颜色 `rgba(0,0,0,0.15)` 自带 alpha 0.15，canvas 绘制时又设 `globalAlpha=0.1`，两次透明度叠加 → 0.015，黑字在白色页面上肉眼不可见
- **修复**：颜色改为不透明 `rgba(0,0,0,1)`，让 opacity 0.1 单独控制透明度 → 10% 黑字，清晰可见
- **学到**：前端"看不见"未必是没渲染，可能是透明度/颜色问题；用无头浏览器 + 解码 canvas 像素是验证水印等视觉效果的有效手段
- **另一处**：妃妃打不开 → Admin「访问 Wiki」按钮用 `hosts+ports` 拼 URL，库配置 `ports=[85]` 但服务在 3010 → 改成 `[3010]` 即可

### 16.5 公开知识库水印访客溯源（外部方案）

- **背景**：公开知识库（无访问认证）没有登录用户，水印里 `authInfo?.username` 恒为空，泄露截图后无任何身份信息可查
- **溯源链路设计**：水印显示「访客ID + 时间戳」→ 泄露截图凭访客ID → 到 `stat` 访问日志表按 `session_id` 反查 IP / UA / 访问轨迹
- **关键问题**：访客ID 从哪来？
  - 中间件 `proxy.ts` 已为每个访客生成 `x-pw-session-id` cookie（httpOnly），stat 表也按它记录
  - 但前端 JS 读不到 httpOnly cookie，水印是客户端 canvas 绘制，拿不到这个 ID
- **解决方案**（三步）：
  1. **中间件注入**：`proxy.ts` 把生成的 sessionId 通过 `NextResponse.next({ request: { headers } })` 注入 SSR 请求头——即使首次访问还没有 cookie 也能让服务端渲染拿到（这是 Next.js 官方支持的在 middleware 给页面传 header 的方式）
  2. **请求透传**：`getServerHeader.ts` 把 `x-pw-session-id` 请求头转发给后端（SSR 请求直达 Java 后端，不走中间件）
  3. **后端新接口**：`ShareAuthController.kt` 新增 `GET /share/pro/v1/auth/info`，读 `x-pw-session-id` 头，返回 `{ username: "访客"+ID末8位 }`，根布局原有的 `getShareProV1AuthInfo` 立即生效，水印组件无需改动
- **验证方法**：curl SSR 页面 → 在 RSC payload 里直接看到 `"username":"访客3dea5fe4"`（sessionId 末8位），证明整条链路：中间件→透传→后端→根布局→水印
- **学到**：① 公开站点无登录也可以做溯源，用"访客会话ID"代替"用户身份"；② 水印组件不用改，补上后端缺失的 auth/info 接口即可让前端自动获得用户名；③ SSR 的 RSC payload 里能直接看到服务端组件拿到的数据，是排查这类链路的好入口
- **注意**：水印只挂在 `(doc)/layout.tsx`，自定义 home 页目前无水印
