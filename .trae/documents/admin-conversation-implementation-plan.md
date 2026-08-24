# Admin「问答」功能实现计划

## 一、Summary（方案概述）

实现 Admin 后台左侧导航「问答」菜单的完整数据链路：

- **App/Widget 前台发生 AI 问答** → Spring Boot 将会话写入 `conversations`、`conversation_messages`、`conversation_references` 三张表
- **Admin 后台调用后端接口** → 读取上述数据并展示为问答列表 + 详情弹窗

需要补齐 Java 后端的两个 Admin 接口：

1. `GET /api/v1/conversation` —— 分页问答列表
2. `GET /api/v1/conversation/detail` —— 单条问答详情

实现后，管理员可在 Admin 后台看到：用户问了什么、从哪个渠道来、IP 归属地、问答时间、AI 完整回答、RAG 引用了哪些文档。

---

## 二、Current State Analysis（现状分析）

### 2.1 前端已就绪

| 文件 | 状态 |
|------|------|
| `web/admin/src/components/Sidebar/index.tsx` | 已配置「问答」菜单，权限要求 `full_control` / `data_operate` |
| `web/admin/src/router.tsx` | `/conversation` 路由已指向问答页面 |
| `web/admin/src/pages/conversation/index.tsx` | 列表页已实现，调用 `getApiV1Conversation` |
| `web/admin/src/pages/conversation/Detail.tsx` | 详情弹窗已实现，调用 `getApiV1ConversationDetail` |
| `web/admin/src/pages/conversation/Search.tsx` | 搜索栏已实现 |
| `web/admin/src/request/Conversation.ts` | API 封装已存在 |
| `web/admin/src/request/types.ts` | 类型定义已存在 |

### 2.2 后端缺口

当前 Java 后端只有 `ConversationController.kt` 中的 `/share/v1/conversation/detail`（给 App 前台共享用），**缺少 Admin 需要的两个接口**：

- `GET /api/v1/conversation`
- `GET /api/v1/conversation/detail`

因此 Admin 点击「问答」后，Network 会报 404，页面显示「暂无数据」。

### 2.3 数据存储现状

`ChatController.kt` 的 `streamChat` 方法已把每次问答写入数据库，但部分字段缺失/不完整：

| 表 | 当前写入情况 | 缺失 |
|----|-------------|------|
| `conversations` | id/kb_id/app_id/subject/remote_ip/created_at | `info` 未写入（用户信息） |
| `conversation_messages` | id/conversation_id/app_id/role/content/kb_id/remote_ip/created_at/info | `provider/model/tokens`、`parent_id`、`image_paths` 未写入 |
| `conversation_references` | 未写入 | RAG 引用未持久化 |

### 2.4 权限现状

`FeedbackController.kt` 已实现 Admin 权限校验模板：

- `requireAdmin()`：解析 JWT 并校验 `role == "admin"`
- `checkKbPermission()`：校验当前用户是否有权访问该知识库

本计划直接复用该模式。

---

## 三、Proposed Changes（具体改动）

### 3.1 扩展 `ConversationController.kt`：新增 Admin 两个接口

**文件**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ConversationController.kt`

**What**：在现有 `/share/v1/conversation/detail` 基础上，新增 `/api/v1/conversation` 列表和 `/api/v1/conversation/detail` 详情。

**Why**：Admin 前端已经写好，只缺后端接口；复用现有控制器，改动最小。

**How**：

- 注入 `JwtService`、`ObjectMapper`、`StatService`
- 拷贝 `FeedbackController.kt` 的 `requireAdmin()` / `checkKbPermission()` 方法
- 列表接口：
  - 参数：`kb_id`（必填）、`page`、`per_page`、`subject`（模糊搜索）、`remote_ip`（模糊搜索）、`app_id`
  - SQL 分页查询 `conversations`，LEFT JOIN `apps` 取 `app_name` 和 `app_type`
  - 用 `StatService.lookupIp()` 解析 IP 归属地
  - 解析 `conversations.info` 中的 `user_info`
  - 用子查询或应用层组装 `feedback_info`（取该会话最新一条有反馈的 assistant 消息）
  - 返回 `{ success, code, message, data: { data, total } }`
- 详情接口：
  - 参数：`id`（conversation_id）、`kb_id`
  - 查 `conversations` 基础字段
  - 查 `conversation_messages` 全部消息（按 `created_at ASC`）
  - 查 `conversation_references` 全部引用
  - 返回引用时同时包含 `name` 和 `title`（前端 `Detail.tsx` 实际读 `title`）
  - 返回 `{ success, code, message, data: detail }`

### 3.2 修改 `ChatController.kt`：写入更完整的会话信息

**文件**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ChatController.kt`

**What**：在 `saveConversation` 和 `saveUserMessage` / `saveAssistantMessage` 中补充字段，并新增保存 `conversation_references` 的逻辑。

**Why**：让 Admin 详情页能正确显示：用户信息、来源渠道、RAG 引用来源、图片消息。

**How**：

- `saveConversation`：如果请求带用户信息（如 ShareAuth 登录态），把 `{ user_info: { auth_user_id, name, email, avatar } }` 写入 `info` 字段
- `saveUserMessage`：补充 `image_paths`（如果前台传了图片）、`parent_id`
- `saveAssistantMessage`：补充 `provider`、`model`、`prompt_tokens`、`completion_tokens`、`total_tokens`、`parent_id`
- 新增 `saveConversationReferences()`：在 assistant 消息保存前，把 `chunks` 中的 `node_id/name/summary` 写入 `conversation_references`（URL 可留空或拼接节点访问链接）

### 3.3 可选：新增 `apps` 类型/名称兜底

**文件**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ChatController.kt`

**What**：`streamChat` 中当前用随机生成的 `appId` 保存会话，但 `apps` 表可能不存在该记录。

**Why**：Admin 列表需要显示 `app_name` 和 `app_type`（Web/Widget/机器人等）。

**How**：

- Web 场景：使用 `apps` 表中该知识库 `type=1` 的记录 ID
- Widget 场景：使用 `apps` 表中该知识库 `type=2` 的记录 ID
- 如果查不到，再回退到随机 ID，并确保 `apps` 表有默认记录

### 3.4 前端无需改动

`web/admin/src/pages/conversation/*` 已完整实现，只要后端接口字段对齐即可正常展示。

---

## 四、Data Flow（实现后的完整流程）

```
App/Widget 前台用户提问
    ↓
POST /share/v1/chat/message 或 /share/v1/chat/widget
    ↓
ChatController.streamChat
    ├── 检索知识库 → 得到 chunks（node_id, name, summary）
    ├── 保存会话 → conversations 表
    ├── 保存用户问题 → conversation_messages 表（role=user）
    ├── 调用大模型生成回答
    ├── 保存 AI 回答 → conversation_messages 表（role=assistant）
    └── 保存引用 → conversation_references 表
    ↓
管理员打开 Admin 后台 → 切到目标知识库 → 点击「问答」
    ↓
GET /api/v1/conversation
    ↓
ConversationController 查 conversations + apps + StatService.lookupIp
    ↓
Admin 列表展示：问题 / 渠道 / 用户 / IP / 时间
    ↓
管理员点击某条问题
    ↓
GET /api/v1/conversation/detail
    ↓
ConversationController 查 messages + references
    ↓
Admin 详情弹窗展示：完整对话气泡 + RAG 引用来源
```

**回答用户的问题：是的，流程就是「App 前台发生问答 → 存入数据库 → Admin 后台读取展示」。**

---

## 五、Assumptions & Decisions（假设与决策）

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 权限模型 | 复用 `FeedbackController`：要求 JWT + `role == "admin"` | 当前 Java 后端已实现该模式，改动最小 |
| 是否检查 `kb_users.perm` | 第一阶段不做，仅校验 admin | 与现有 `FeedbackController` 保持一致，后续可扩展 |
| IP 归属地 | 复用 `StatService.lookupIp()` | 已有简化实现，演示够用 |
| 用户信息来源 | 优先读 `conversations.info -> user_info`，为空则显示「匿名用户」 | 与前端 `Detail.tsx` 逻辑对齐 |
| 引用来源 | 保存检索到的 chunks 到 `conversation_references` | 比从回答文本正则提取更稳定 |
| 是否新建 Controller | 不新建，直接扩展 `ConversationController.kt` | 接口数量少，改动最小 |
| 是否需要改前端 | 不改 | 前端已实现，只缺后端接口 |
| `app_id` 处理 | Web/Widget 分别用对应 type 的真实 app ID | 保证 Admin 列表能显示正确来源渠道 |

---

## 六、Verification Steps（验证步骤）

### 6.1 编译

```cmd
cd backend-java
.\gradlew.bat compileKotlin compileJava -q --no-daemon
```

### 6.2 重启 Java 后端

```cmd
:: 先停止旧 8080 进程
netstat -ano | findstr :8080
:: taskkill /PID <pid> /F

:: 重新启动
cd backend-java
.\gradlew.bat bootRun --no-daemon
```

### 6.3 用 APIfox / curl 测试接口

**登录拿 JWT：**
```cmd
curl -X POST http://localhost:8080/api/v1/user/login -H "Content-Type: application/json" -d "{\"account\":\"admin\",\"password\":\"admin123\"}"
```

**测试列表接口：**
```cmd
curl "http://localhost:8080/api/v1/conversation?kb_id=<kb_id>&page=1&per_page=20" -H "Authorization: Bearer <jwt>"
```

**测试详情接口：**
```cmd
curl "http://localhost:8080/api/v1/conversation/detail?id=<conversation_id>&kb_id=<kb_id>" -H "Authorization: Bearer <jwt>"
```

### 6.4 端到端验证

1. 启动 App 前台（`http://localhost:3010`）
2. 打开智能问答，输入问题，等待 AI 回答
3. 打开 Admin 后台（`http://localhost:5173`）
4. 切到同一知识库，点击左侧「问答」
5. 验证：列表出现刚问的问题
6. 点击问题，验证：详情弹窗展示完整对话和引用来源

### 6.5 Arthas 验证（可选）

```cmd
:: Attach 到 Java 进程
java -jar arthas-boot.jar

:: 监听 ConversationController 方法调用
watch com.chaitin.pandawiki.controller.ConversationController list '{params,returnObj}' -x 2
watch com.chaitin.pandawiki.controller.ConversationController detail '{params,returnObj}' -x 2
```

---

## 七、Risk & Fallback（风险与回退）

| 风险 |  fallback |
|------|-----------|
| `apps` 表没有对应 type 记录，导致 `app_name` 为空 | 列表显示 `-` 或回退显示 `app_type` 数字 |
| `conversations.info` 为空，用户显示「匿名用户」 | 这是正常行为，前台登录态接入后再补 |
| `conversation_references` 为空，详情无内容来源 | 先保证接口通，引用持久化可第二步做 |
| 权限校验与前端菜单权限要求不一致 | 前端要求 `full_control` / `data_operate`，后端先按 admin 放行，后续对齐 `kb_users.perm` |

---

## 八、Files to Modify（需要修改的文件清单）

1. `backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ConversationController.kt`（主要改动）
2. `backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ChatController.kt`（补充字段和引用保存）

---

## 九、Estimated Scope（工作量估算）

- 后端接口实现：中等（约 200 行 Kotlin）
- ChatController 补充字段：小（约 50 行）
- 测试验证：小
- 前端无需改动
