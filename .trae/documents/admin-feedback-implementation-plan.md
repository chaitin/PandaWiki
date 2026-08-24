# Admin「反馈」功能补齐实现计划

## 一、落地效果（实现后能看到什么）

完整链路：**App 前台用户对 AI 回答点赞/点踩或评论文档 → 数据入库 → Admin 后台「反馈」页查看与管理**。

实现并补齐后端缺口后，管理员打开 Admin → 左侧「反馈」，能看到两个 Tab：

### Tab 1：AI 问答评价
- 列表展示所有**被用户评价过的 AI 回答**（点赞👍 / 点踩👎）
- 每行包含：问题、来源渠道（网页挂件/网页应用）、用户反馈（👍/👎 + 反馈标签 + 自定义意见）、来源用户、来源 IP + 归属地、问答时间
- **点击问题 → 弹出「问答记录」详情弹窗，查看完整对话气泡（用户问题 + AI 回答）** ← 当前会 404，本次重点补齐

### Tab 2：文档评论
- 列表展示前台文档评论：文档名、状态（待审核/已通过/已拒绝）、姓名、评论内容、来源 IP、发布时间
- 支持审核操作：**通过 / 拒绝 / 删除**（后端接口已具备，本功能已可用）

### 演示方法（怎么制造数据看效果）
1. 打开 App 前台（`http://localhost:3010`）→ Ctrl+K 智能问答 → 提问 → 等 AI 回答
2. 对回答点「👍」或「👎」；点踩时可选反馈标签、填意见
3. 前台调用 `POST /share/v1/chat/feedback`（已实现）→ 更新 `conversation_messages.info`
4. 切到 Admin →「反馈」→「AI 问答评价」，即可看到这条评价
5. 点击该问题，验证详情弹窗能打开并显示完整对话

---

## 二、Current State Analysis（现状分析）

### 2.1 前端已 100% 就绪（无需改动）

| 文件 | 状态 |
|------|------|
| `web/admin/src/components/Sidebar/index.tsx` | 「反馈」菜单已配置（第 66-76 行），权限 `full_control`/`data_operate` |
| `web/admin/src/router.tsx` | `/feedback/:tab?` 路由已指向反馈页 |
| `web/admin/src/pages/feedback/index.tsx` | 两个 Tab：AI 问答评价 / 文档评论 |
| `web/admin/src/pages/feedback/Evaluate.tsx` | 评价列表，调用 `message/list` + `message/detail` |
| `web/admin/src/pages/feedback/Detail.tsx` | 评价详情弹窗，调用 `message/detail` |
| `web/admin/src/pages/feedback/Comments.tsx` | 文档评论管理（通过/拒绝/删除） |
| `web/admin/src/request/Message.ts` | `getApiV1ConversationMessageList` / `getApiV1ConversationMessageDetail` 封装已存在 |

### 2.2 Java 后端现状

| 接口 | 前端调用处 | Java 后端状态 |
|------|-----------|--------------|
| `POST /share/v1/chat/feedback`（前台点赞/点踩） | App `AiQaContent.tsx` | ✅ `FeedbackController.kt` 已实现 |
| `GET /api/v1/conversation/message/list`（评价列表） | `Evaluate.tsx` | ✅ 已实现 |
| `GET /api/v1/conversation/message/detail`（评价详情） | `Detail.tsx` | ❌ **缺失，点击问题会 404** |
| `GET /api/v1/comment`（评论列表） | `Comments.tsx` | ✅ `CommentController.kt` 已实现 |
| `POST /api/pro/v1/comment_moderate`（审核） | `Comments.tsx` | ✅ 已实现 |
| `DELETE /api/v1/comment/list`（删除评论） | `Comments.tsx` | ✅ 已实现 |

### 2.3 message/list 的字段缺口（影响观感）

对比 Go 参考实现，Java 版 `message/list` 返回少两个字段：
- **`app_type`**：未 JOIN `apps` 表 → 前端「来源渠道」列显示 `-`
- **`ip_address`**：未用 `StatService.lookupIp()` 解析 → 前端「来源 IP」列只显示 IP 无归属地

`DomainConversationMessageListItem` 类型已定义这两个字段，前端直接读取，后端补上即可。

### 2.4 表结构
`conversation_messages` 表字段齐全（id/conversation_id/app_id/role/content/provider/model/tokens/remote_ip/created_at/info/image_paths/parent_id/kb_id），`message/detail` 可直接查库返回，无需改表。

---

## 三、Proposed Changes（具体改动）

**改动文件仅一个**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/FeedbackController.kt`

### 3.1 新增 `GET /api/v1/conversation/message/detail`（核心）

**What**：新增 `messageDetail` 方法，按 `id` + `kb_id` 查单条消息并返回。

**Why**：前端 `Detail.tsx` 点击问题弹窗调用此接口，当前 404。

**How**：
- 复用现有 `requireAdmin()` / `checkKbPermission()` 鉴权
- SQL 查 `conversation_messages WHERE id = ? AND kb_id = ?`，查不到返回 404
- 返回字段对齐 `DomainConversationMessage` 类型（前端只用 `content` / `created_at`，其余按类型定义补齐）：
  - `id`、`app_id`、`conversation_id`、`role`、`content`
  - `provider`、`model`、`prompt_tokens`、`completion_tokens`、`total_tokens`
  - `remote_ip`、`created_at`（ISO 时间）、`info`（反馈信息）、`image_paths`（数组）
- `image_paths` 解析逻辑复用 `ConversationController.adminDetail` 里 `java.sql.Array` 的处理方式
- 时间格式化复用现有 `formatTime`（FeedbackController 目前无该方法，需补一个与 ConversationController 相同的私有方法）

### 3.2 增强 `message/list` 返回字段（推荐，直接影响观感）

**What**：补 `app_type` 和 `ip_address` 两个字段。

**Why**：前端列表「来源渠道」「来源 IP 归属地」两列目前是空的，补齐后页面完整。

**How**：
- 列表 SQL 增加 `LEFT JOIN apps a ON cm.app_id = a.id`，`SELECT` 增加 `a.type AS app_type`
- 注入 `StatService`，对每条记录的 `remote_ip` 调用 `statService.lookupIp(ip)` 填充 `ip_address`
- 在 `ConversationMessageListItem` data class 增加 `app_type: Int` 和 `ip_address: Any?` 字段

### 3.3 前端、数据库、路由均无需改动

---

## 四、Assumptions & Decisions（假设与决策）

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 改动范围 | 仅后端 `FeedbackController.kt` | 前端已完整，只缺后端接口与字段 |
| 权限模型 | 复用 `requireAdmin` + `checkKbPermission` | 与现有 `message/list` 保持一致 |
| `message/detail` 返回 | 单条消息全字段 | 对齐 Go `GetMessageDetail` 与前端类型定义 |
| `message/list` 补字段 | 补 `app_type` + `ip_address` | 前端已读取，补齐即生效，工作量小 |
| 是否新建 Controller | 否，扩展 `FeedbackController.kt` | 反馈相关接口集中于此，改动最小 |

---

## 五、Verification Steps（验证步骤）

### 5.1 编译
```cmd
cd backend-java
.\gradlew.bat compileKotlin compileJava -q --no-daemon
```

### 5.2 重启 Java 后端
```cmd
:: 停止旧 8080 进程
netstat -ano | findstr :8080
:: taskkill /PID <pid> /F
cd backend-java
.\gradlew.bat bootRun --no-daemon
```

### 5.3 用 APIfox / curl 测试
1. 登录拿 JWT：
```cmd
curl -X POST http://localhost:8080/api/v1/user/login -H "Content-Type: application/json" -d "{\"account\":\"admin\",\"password\":\"admin123\"}"
```
2. 测列表（应返回 `app_type`/`ip_address`）：
```cmd
curl "http://localhost:8080/api/v1/conversation/message/list?kb_id=<kb_id>&page=1&per_page=20" -H "Authorization: Bearer <jwt>"
```
3. 测详情（关键验证点）：
```cmd
curl "http://localhost:8080/api/v1/conversation/message/detail?id=<message_id>&kb_id=<kb_id>" -H "Authorization: Bearer <jwt>"
```

### 5.4 端到端演示
1. App 前台（3010）提问 → 对 AI 回答点赞/点踩（点踩可填标签与意见）
2. Admin（5173）→「反馈」→「AI 问答评价」→ 列表出现该评价，渠道/IP 归属地正常
3. 点击问题 → 详情弹窗正常展示完整对话
4. 「文档评论」Tab → 对评论执行通过/拒绝/删除

### 5.5 Arthas 排查（可选）
```cmd
java -jar arthas-boot.jar
watch com.chaitin.pandawiki.controller.FeedbackController messageDetail '{params,returnObj}' -x 2
```

---

## 六、Files to Modify（文件清单）

1. `backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/FeedbackController.kt`（新增 detail 接口 + 增强 list 字段）

---

## 七、关于「反馈还没实现」的说明

经探索，**「反馈」前端页面与大部分后端接口其实已实现**，现状是：
- 前台点赞/点踩、评价列表、文档评论管理 = 已可用
- **唯一功能性缺口** = 评价详情接口 `message/detail` 未实现，导致点击评价弹不出问答记录（404）
- 观感缺口 = 列表缺 `app_type` / `ip_address`，渠道与 IP 归属地显示不全

所以本次是「补齐」而非「从零实现」，改动集中在后端一个文件。
