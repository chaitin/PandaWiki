# 贡献（Contribute）模块 Java 后端实现方案

## Summary

补齐 PandaWiki Java 后端缺失的"文档贡献"链路，使前台用户能够新增/编辑文档并提交审核，Admin 后台能够查看、对比、采纳或拒绝贡献。方案采用最小可用实现（方案 A）：审核通过后直接操作 `nodes` 表，不保留版本历史，RAG 向量重建由管理员在文档管理页手动触发。

同时应用户要求，**去掉前台编辑器保存时的图形验证码**。

## Current State Analysis

### 已有内容

| 位置 | 状态 |
|---|---|
| `web/app` 前台编辑器（新增/编辑） | 已存在，保存时调用 `POST /share/pro/v1/contribute/submit` |
| `web/admin` 后台"贡献"页面 | 已存在，调用 `GET/POST /api/pro/v1/contribute/*` |
| 数据库 `contributes` 表 | 已存在（`V1__init_schema.sql` 第 524-544 行） |
| 数据库 `nodes` / `navs` 表 | 已存在，CRUD 由 `NodeController` 提供 |
| 验证码组件 `@cap.js/widget` | 已集成在前台 `ConfirmModal.tsx` |

### 缺失内容

| 位置 | 状态 |
|---|---|
| Java 后端 `Contribute` 实体 | 缺失 |
| Java 后端 `ContributeRepository` | 缺失 |
| Java 后端贡献 Controller（4 个接口） | 缺失 |
| 前台验证码调用 | 需要移除 |

### 前端接口约定

由 `web/admin/src/request/pro/types.ts` 与 `web/app/src/request/pro/types.ts` 推导：

```ts
// 前台提交
POST /share/pro/v1/contribute/submit
body: {
  captcha_token: string   // 本次方案中改为可选/忽略
  content?: string
  content_type: "html" | "md"
  emoji?: string
  name?: string
  node_id?: string
  reason: string
  type: "add" | "edit"
}

// 后台列表
GET /api/pro/v1/contribute/list
params: { kb_id, node_name?, auth_name?, status?, page, per_page }
resp: { list: ContributeItem[], total: number }

// 后台详情
GET /api/pro/v1/contribute/detail
params: { id, kb_id }
resp: ContributeDetailResp（含 original_node 用于 diff）

// 后台审核
POST /api/pro/v1/contribute/audit
body: { id, kb_id, nav_id, parent_id?, status: "approved" | "rejected" }
```

### 关键依赖

- `NodeController` 已提供创建/更新 node 逻辑；`update` 方法在修改已发布文档时会自动删除旧 embedding 并标记 `rag_info.status = PENDING`。
- `CaptchaController` 已提供验证码校验；本次方案**不再调用**。
- `CommentController` 已展示如何从 `HttpServletRequest` 取 IP。

## Proposed Changes

### 1. 新增 `backend-java/src/main/java/com/chaitin/pandawiki/entity/Contribute.java`

映射 `contributes` 表字段，与 Go 版 `domain/contribute.go` 保持一致：

```java
@Entity
@Table(name = "contributes")
@Getter @Setter @NoArgsConstructor
public class Contribute {
    @Id private String id;
    private Long authId;
    private String kbId;
    private String status;      // pending / approved / rejected
    private String type;        // add / edit
    private String nodeId;
    private String name;
    private String content;
    private String reason;
    private String auditUserId;
    private OffsetDateTime auditTime;
    private String remoteIp;
    @Type(JsonType.class) private Map<String, Object> meta;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
```

### 2. 新增 `backend-java/src/main/java/com/chaitin/pandawiki/repository/ContributeRepository.java`

继承 `JpaRepository<Contribute, String>`，提供：
- `Page<Contribute> findByKbId(String kbId, Pageable pageable)`
- 通过 `@Query` 实现按 `node_name`、`auth_name`、`status` 的模糊筛选

### 3. 新增 `backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ContributeController.kt`

实现 4 个接口：

#### 3.1 `POST /share/pro/v1/contribute/submit`

- 从 `HttpServletRequest` 取 `remote_ip`
- 从 `x-pw-session-id` header 生成访客标识（可选，用于匿名记录）
- 将 `node_id`、`name`、`content`、`type`、`reason`、`emoji`、`content_type` 落库
- `status = pending`
- `audit_user_id` 先置空
- **不再校验 `captcha_token`**，但保留字段兼容前端

#### 3.2 `GET /api/pro/v1/contribute/list`

- 校验登录（复用 `JwtService.parseBearer`）
- 按 `kb_id` + 可选条件分页查询
- 联查 `auths` / 会话信息得到 `auth_name`、`avatar`
- 使用现有 IP 解析工具（或 CommentController 同风格处理）得到 `ip_address`
- 返回 `list` + `total`

#### 3.3 `GET /api/pro/v1/contribute/detail`

- 按 `id` + `kb_id` 查单条
- `edit` 类型时，同步返回原 `node` 的 `content`、`name`、`meta`，用于前端 diff

#### 3.4 `POST /api/pro/v1/contribute/audit`

- 校验登录并取当前用户 ID 作为 `audit_user_id`
- `rejected`：仅更新 `status = rejected` + `audit_time`
- `approved` + `edit`：调用 `NodeController` 风格的 update 逻辑，更新原 node 的 `name`、`content`、`meta`
- `approved` + `add`：新建 node，设置 `kb_id`、`nav_id`、`parent_id`、`name`、`content`、`meta`，默认 `status = 1`（未发布）、`type = 2`（文档）

### 4. 修改 `web/app/src/views/editor/edit/ConfirmModal.tsx`

移除 `cap.js` 验证码弹窗逻辑：

```tsx
// 删除 @cap.js/widget 动态导入
// 删除 cap.solve() 调用
// onOk(reason, "") 直接提交
```

### 5. 修改 `web/app/src/views/editor/index.tsx`（可选）

保存成功后当前是 `window.close()`，浏览器常拦截失败。建议改为：

```tsx
// 优先 close，失败则 history.back() 或 location.href = '/'
```

### 6. 更新操作/毕设记录

- `E:/PandaWiki/others/oprater.md`：记录新增文件与改动点
- `E:/PandaWiki/others/bishe.md`：沉淀贡献流程、排查过程、可讲内容

## Assumptions & Decisions

| 决策 | 说明 |
|---|---|
| 去掉图形验证码 | 用户明确要求，降低前台提交门槛 |
| `captcha_token` 保留但忽略 | 前端请求体仍有该字段，后端直接放行 |
| 审核通过直接改 `nodes` 表 | 不保留版本历史，不生成 release |
| 新建 node 默认 status=1 | 与 `NodeController.create` 保持一致，前台可见（当前 ShareController 未过滤 status） |
| RAG 手动触发 | 更新已发布文档时 `NodeController.update` 会清向量；管理员随后点"重新学习" |
| 游客提交 auth_id 为空 | 后台显示"匿名用户"，与现有 `ShareAuthController` 访客逻辑一致 |
| 权限校验复用现有 JWT | 后台 `/api/pro/v1/contribute/*` 必须登录；前台 `/share/pro/v1/contribute/submit` 公开 |

## Verification Steps

1. 重启 Java 后端，确认 4 个接口在 swagger/APIfox 可访问。
2. 打开 app 前台文档页，hover 右下角菜单 → 编辑文档。
3. 修改内容并提交，确认弹窗不再要求验证码，提示"保存成功"。
4. Admin 后台 → 贡献 → 看到一条 `pending` 记录。
5. 点击记录查看详情，`edit` 类型可看到"修改前/修改后/diff"。
6. 点击"采纳"，刷新前台文档页，内容已更新。
7. 若原文档已发布，Admin 文档管理 → 对该文档点"重新学习"，确认 RAG 问答使用新内容。
8. 测试"新增文档"：前台创建 → 后台采纳并选择目录 → 前台目录出现新文档。
9. 测试"拒绝"：状态变为 `rejected`，前台无变化。
