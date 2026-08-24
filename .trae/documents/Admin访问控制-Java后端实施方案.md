# Admin「访问控制」— Java 后端实施方案

## 1. 方案摘要

目标：让 Admin 后台「设置 → 访问控制」标签页在 **Java 后端（`backend-java`）** 完整可用。

该标签页前端已全部实现（[CardKB.tsx](file:///e:/PandaWiki/web/admin/src/pages/setting/component/CardKB.tsx)），但因为 Java 后端缺接口，当前打开是空/报错。「访问控制」标签页包含两块内容：

1. **Wiki 站管理员**（知识库用户管理）：列出、添加、改权限、移除 KB 用户。
2. **API Token**（pro 接口）：创建、列表、更新、删除 API Token。

本次落地 = **只改 Java 后端**，补齐这两块的接口 + 权限校验模型 + Token 鉴权，前端一行不改。

范围分三档：
- **必做**：3.1 鉴权帮助类、3.2 KB 用户管理、3.3 API Token 管理、3.4 Token 鉴权过滤器
- **可选加分**：3.5 外部接入开放接口（喂文档 + 问答检索，答辩现场演示闭环）

---

## 2. 现状分析

### 2.1 前端（已就绪，等待后端）

- 标签页入口：[index.tsx](file:///e:/PandaWiki/web/admin/src/pages/setting/index.tsx) 中 `访问控制` tab → `<CardKB />`
- [CardKB.tsx](file:///e:/PandaWiki/web/admin/src/pages/setting/component/CardKB.tsx)：Wiki 站管理员列表（`getApiV1KnowledgeBaseUserList` / `delete` / `update`）+ API Token 区块
- [AddRole.tsx](file:///e:/PandaWiki/web/admin/src/pages/setting/component/AddRole.tsx)：添加管理员弹窗（`getApiV1UserList` 选人 + `postApiV1KnowledgeBaseUserInvite`）
- 前端所需接口（**Java 后端全部缺失**）：

| 方法 | 路径 | 前端消费 |
|------|------|----------|
| GET | `/api/v1/knowledge_base/user/list?kb_id=` | CardKB 列表 |
| POST | `/api/v1/knowledge_base/user/invite` | AddRole 添加 |
| PATCH | `/api/v1/knowledge_base/user/update` | CardKB 改权限 |
| DELETE | `/api/v1/knowledge_base/user/delete?kb_id=&user_id=` | CardKB 移除 |
| POST/GET/PATCH/DELETE | `/api/pro/v1/token/*` | CardKB 的 ApiToken 区块 |
| GET | `/api/v1/user/list` | AddRole 选人（**已实现**） |

### 2.2 Java 后端现状

- 已实现：[UserController.java](file:///e:/PandaWiki/backend-java/src/main/java/com/chaitin/pandawiki/controller/UserController.java)（含 `user/list`）、[KnowledgeBaseController.java](file:///e:/PandaWiki/backend-java/src/main/java/com/chaitin/pandawiki/controller/KnowledgeBaseController.java)（KB CRUD + release，`detail` 已返回 `perm` 字段）
- 未实现：全部 KB 用户管理 + API Token 接口
- 鉴权方式：各 Controller 手动 `JwtService.parseBearer`（无 Spring Security 过滤器链）
- 响应格式：Admin 接口兼容「裸数据 / `{success,data}` 包装」两种（前端 [httpClient.ts](file:///e:/PandaWiki/web/admin/src/request/httpClient.ts) 自动解包）

### 2.3 数据库表（已建好，无需迁移）

`V1__init_schema.sql` 来源 000020 / 000025 已建：

- `kb_users`：`id BIGSERIAL`、`kb_id`、`user_id`、`perm`、`created_at`，`UNIQUE(kb_id,user_id)`
- `api_tokens`：`id TEXT PK`、`kb_id`、`name`、`user_id`、`token`、`permission`、`created_at`、`updated_at`，`UNIQUE(token)`

### 2.4 权限模型（Go 参考）

- 全局角色：`users.role` = `admin` / `user`，admin 拥有所有知识库 full_control 权限（绕过 kb_users 检查）
- KB 权限：`kb_users.perm` = `full_control` / `doc_manage` / `data_operate`
- API Token：按 kb 归属 + 权限，可用来认证调用 `/api/v1/**` 接口（Go 侧 `repo/pg/ap_token.go` 按 token 查库）
- 版本分权限制：非企业版只允许 `full_control`（Java 的 `LicenseController.kt` 返回 `edition=3` 企业版，不受限）

---

## 3. 具体改动清单

### 3.1 公共鉴权帮助类（新增）

文件：`backend-java/src/main/java/com/chaitin/pandawiki/security/KbAccessService.java`

- `resolveKbPerm(kbId, authHeader)`：解析 JWT → role；`admin` 直接返回 `full_control`；否则查 `kb_users.perm`
- `requireFullControl(kbId, authHeader, response)`：非 full_control 写 403 返回
- 复用点：`KnowledgeBaseController.resolvePerm` 的重复逻辑可收敛到它（可选优化，让非 admin 但 full_control 的用户 `detail.perm` 也正确）

### 3.2 KB 用户管理接口（新增）

文件：`backend-java/src/main/java/com/chaitin/pandawiki/controller/KbUserController.java`（Java，沿用现有 Controller 风格）

| 方法 | 路径 | 入参 | 核心逻辑 |
|------|------|------|----------|
| GET | `/api/v1/knowledge_base/user/list` | `kb_id` | 两条 SQL：① `users JOIN kb_users` 查 `role='user'` 的普通用户（按 created_at DESC）；② 查全部 `role='admin'` 用户，补 `perms=full_control`。合并返回 `[{id,account,role,perms}]` |
| POST | `/api/v1/knowledge_base/user/invite` | `{kb_id,user_id,perm}` | 校验 perm 枚举、用户存在且**非 admin**、未重复加入 → `INSERT INTO kb_users` |
| PATCH | `/api/v1/knowledge_base/user/update` | `{kb_id,user_id,perm}` | 校验目标存在且非 admin → `UPDATE kb_users SET perm` |
| DELETE | `/api/v1/knowledge_base/user/delete` | `kb_id,user_id` | 校验非 admin → `DELETE FROM kb_users` |

**权限要求**：invite / update / delete 必须 `full_control`（admin 或 `kb_users.perm=full_control`）。

**响应格式**：统一 `{success, code, message, data}`（对齐 Go 的 PWResponse，前端 httpClient 自动解包 data）。

### 3.3 API Token 接口（新增）

文件：`backend-java/src/main/java/com/chaitin/pandawiki/controller/ApiTokenController.java`（Java）

| 方法 | 路径 | 入参 | 核心逻辑 |
|------|------|------|----------|
| POST | `/api/pro/v1/token/create` | `{kb_id,name,permission}` | 生成随机 token（如 `pw_`+UUID），`INSERT INTO api_tokens`，返回完整 token 供前端复制 |
| GET | `/api/pro/v1/token/list` | `kb_id` | `SELECT` 该 kb 全部 token（前端自己做脱敏展示，后端返回全量） |
| PATCH | `/api/pro/v1/token/update` | `{kb_id,id,permission}` | `UPDATE api_tokens SET permission` |
| DELETE | `/api/pro/v1/token/delete` | `kb_id,id` | `DELETE FROM api_tokens` |

**权限要求**：全部要求 `full_control`。

**响应格式**：`{success, code, message, data}`（pro 接口约定，见 Autal.md 4.1）。

### 3.4 API Token 鉴权过滤器（必做）

让创建的 Token 真正「能用」：新增一个 `OncePerRequestFilter` / `HandlerInterceptor`——当 `Authorization: Bearer xxx` 不是合法 JWT 时，回退查 `api_tokens`，命中则放行并把 `kb_id` / `permission` 写入 request attribute。这样 Token 可替代 JWT 调用接口（外部平台拿 key 直接调），是「访问控制」闭环的关键一环。

- 过滤器对所有 `/api/v1/**`、`/api/pro/v1/**` 生效
- 命中逻辑：先 `JwtService.parseBearer` 解析；失败 → 查 `api_tokens.token`；命中则构造与 JWT 等价的鉴权上下文（`{kbId, permission, userId}`）
- 未命中且非白名单路径 → 401（与现有 `AuthController` 的拦截行为一致）

### 3.5 外部接入开放接口（可选加分项）

让外部平台拿 key 真正「喂文档 + 问答检索」，形成完整演示闭环。新增 `RagController.java`，复用已有能力：

| 方法 | 路径 | 入参 | 复用 |
|------|------|------|------|
| POST | `/api/v1/rag/documents` | multipart 文件 + kb_id | [DocumentParseService.kt](file:///e:/PandaWiki/backend-java/src/main/kotlin/com/chaitin/pandawiki/service/DocumentParseService.kt) 解析 + [EmbeddingService.kt](file:///e:/PandaWiki/backend-java/src/main/kotlin/com/chaitin/pandawiki/service/EmbeddingService.kt) 向量化入库 |
| POST | `/api/v1/rag/retrieval` | `{kb_id, query}` | 向量检索相似度 top-K，返回文本片段 |

- 鉴权走 3.4：`Authorization: Bearer <API Token>`
- 验证方式：curl / Python 脚本现场演示「建 key → 传 PDF → 提问返回答案」
- 注意：这是对标 Go Pro 的 `datasets / retrieval` 接口的**最小实现**，向量存储直接用现有表/服务，不做复杂分块策略

> 本节可不做，但做了答辩演示效果最佳（外部平台接入闭环）。

---

## 4. 关键决策与边界

- **admin 用户**：不可被 invite（Go 参考报 `knowledge base can not invite to admin user`）、不可改权限、不可删除；列表中始终出现且 `perms=full_control`
- **重复邀请**：依赖 `kb_users` 唯一约束，捕获唯一冲突返回友好提示「该用户已在知识库中」
- **perm 合法性**：只允许 `full_control` / `doc_manage` / `data_operate`
- **版本分权**：当前 License 返回企业版不做限制，但保留 `edition` 判断逻辑，方便答辩讲解版本差异
- **不改前端**：接口字段名严格对齐 `V1KBUserListItemResp`（`id/account/role/perms`）

---

## 5. 验证步骤

1. 启动后端：根目录 `start.cmd`（或 `backend-java` 下 `gradlew bootRun`）
2. **APIfox**：登录 `/api/v1/user/login` 拿 token → 依次测 4 个 KB 用户接口 + 4 个 token 接口（含权限/边界用例：邀请 admin 应报错、非 full_control 应 403）
3. **浏览器**：刷新 Admin → 设置 → 访问控制，走通「添加管理员 → 列表 → 改权限 → 删除」+「创建 API Token → 列表 → 改权限 → 删除」全流程
4. **Token 鉴权**：用刚创建的 API Token（不带 JWT）直接调 `/api/v1/**` 接口，应能通过鉴权
5. （可选，3.5）用 curl / Python 脚本：建 key → 传 PDF → 检索问答，验证外部接入闭环

---

## 6. 落地可以做什么（答辩可讲点）

实现后「访问控制」页完整可用，形成三层权限模型，是答辩的好素材：

1. **Wiki 站管理员（RBAC 知识库级授权）**：多管理员协作、权限分级（完全控制 / 文档管理 / 数据运营），体现「全局角色 + 知识库权限」双层设计
2. **API Token**：机器访问凭据，可按 kb 隔离、可分级、可吊销，适合对接自动化/开放平台
3. **权限校验链路**：`users.role`（全局 admin 直通）→ `kb_users.perm`（知识库级）→ `api_tokens`（API 级），可对比讲解 Go 版 `user_access.go` 的 `ValidateRole / ValidateKBPerm`
4. **（若做 3.5）外部接入闭环**：拿 key → 传文档 → 问答检索，现场演示「第三方平台对接 PandaWiki」的完整链路，效果最佳

**后续可再延伸（本次不做）**：
- **访问认证（CardAuth 组件，当前未挂载到页签）**：完全公开 / 需要认证（密码、钉钉/飞书/企微/OAuth/CAS/LDAP/GitHub）/ 禁止访问 —— 三档访问设置 + App 前台强制拦截（对应 Go `middleware/share_auth.go` 的 `CheckForbidden` / `Authorize`）
- **文档级权限**：`nodes.permissions` 三开关 `visible / visitable / answerable`