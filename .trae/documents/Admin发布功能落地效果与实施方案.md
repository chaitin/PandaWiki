# Admin「发布」功能落地效果与实施方案

## 一、落地效果总览（这份方案要让「发布」达到什么效果）

「发布」不是"点一下按钮生成一条记录"这么简单，完整的落地效果是把 **内容生产 → 审核发布 → 前台可见** 串成一条链路，让系统具备内容生命周期管理能力。具体 5 个效果：

| # | 落地效果 | 现状 | 本方案动作 |
|---|---------|------|-----------|
| 1 | **前台内容门禁**：只有"已发布"内容对访客可见，草稿/改后未发布内容隐藏 | ❌ 前台直接读 `nodes` 表，未发布内容也能看到 | 改 `ShareController` 过滤 |
| 2 | **版本快照**：每次发布生成全量快照，可追溯任意历史版本 | ✅ 已有（`kb_releases`/`node_releases`） | 保留 |
| 3 | **版本回滚**：一键回滚到任意历史版本 | ❌ 前端按钮被注释、无后端接口 | 新增回滚接口 + 启用按钮 |
| 4 | **版本管理细节**：发布者记录、分页、当前版本标识、历史版本删除 | ⚠️ 发布者/分页缺失、删除空壳 | 补后端 + 启用前端 |
| 5 | **发布引导**：侧边栏「发布」菜单显示未发布数量角标 | ❌ 无 | 可选，调 `/api/v1/node/stats` |

> 核心一句话：**「发布」是内容从"编辑态"进入"线上态"的唯一闸门**，配合版本快照/回滚，形成"改坏了能回退"的安全网。这是答辩里讲内容生命周期管理的核心卖点。

---

## 二、现状分析（已确认的代码事实）

### 前端 Admin
- 发布页 [index.tsx](file:///e:\PandaWiki/web/admin/src/pages/release/index.tsx)：
  - 列表列：版本号/备注/发布者/发布时间，第一条标「当前版本」
  - 「发布新版本」弹窗 [VersionPublish.tsx](file:///e:\PandaWiki/web/admin/src/pages/release/components/VersionPublish.tsx)：调 `GET /api/v1/node/list/group/nav?status=unpublished` 列出未发布文档，提交 `POST /api/v1/knowledge_base/release`
  - 「回滚/删除」操作列整段被注释，[VersionReset.tsx](file:///e:\PandaWiki/web/admin/src/pages/release/components/VersionReset.tsx) / [VersionDelete.tsx](file:///e:\PandaWiki/web/admin/src/pages/release/components/VersionDelete.tsx) 的 `submit()` 是空壳
  - 列表读取 `res.data`（数组）+ `res.total`；`curVersionId` 取 `res.data[0].id`

### 后端 Java
- [KnowledgeBaseController.java](file:///e:\PandaWiki/backend-java/src/main/java/com/chaitin/pandawiki/controller/KnowledgeBaseController.java)：
  - `POST /api/v1/knowledge_base/release`：建 `kb_releases` + 逐节点建 `node_releases` + 关联表 + `nodes.status=2` + 触发向量化（已实现）
  - `GET /api/v1/knowledge_base/release/list`：返回 `data=rows` 数组（无分页/无 total/无发布者）；`kb_releases.publisher_id` 字段表里有但从不写入
- [ShareController.kt](file:///e:\PandaWiki/backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ShareController.kt)：`/share/v1/node/list`、`/share/v1/node/detail` 查 `nodes` **不带 status 过滤** → 门禁缺失（根因）
- 节点状态约定：`status 0=草稿、1=更新未发布、2=已发布`；`/api/v1/node/stats` 已返回 `unpublished_count`
- 数据库 `V1__init_schema.sql`：`kb_releases` 已有 `publisher_id` 字段；`kb_release_node_releases` 含 `node_release_id` 外键

### 关键缺口总结
1. 前台门禁缺失（改一处 SQL 即可）
2. 发布者未记录、列表无分页/total → 前端「共 X 个」恒为 0、发布者列为空
3. 回滚/删除接口不存在 → 前端按钮只能注释
4. 发布列表结构变化需同步改前端读取方式

---

## 三、改动方案

### 3.1 后端：发布列表补齐发布者 + 分页 + 当前版本（改 `KnowledgeBaseController.java`）

**为什么**：前端列需要 `publisher_account`、分页需要 `total`、「当前版本」需要第一条标记。

**怎么做**（`releaseList` 方法重写）：
- 参数增加 `page`（默认 1）、`per_page`（默认 20）
- SQL 主查询：`SELECT r.id, r.kb_id, r.tag, r.message, r.created_at, u.account AS publisher_account FROM kb_releases r LEFT JOIN users u ON u.id = r.publisher_id WHERE r.kb_id = ? ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
- 总数查询：`SELECT COUNT(*) FROM kb_releases WHERE kb_id = ?`
- 返回结构改为 `data: { list: [...], total: N }`（第一条自动即当前版本，前端已有「当前版本」逻辑）

### 3.2 后端：发布时记录发布者（改 `release` 方法）

**为什么**：发布者字段存了才有溯源价值。

**怎么做**：
- 从请求头 `Authorization` 解析 JWT（复用现有 `JwtService`）取 `account`/`id`，写入 `INSERT INTO kb_releases ... publisher_id` 的 SQL
- 无 JWT 或解析失败时不强求（存空），不阻塞发布

### 3.3 后端：新增版本回滚接口（新增 `POST /api/v1/knowledge_base/release/rollback`）

**为什么**：回滚 = 用历史快照覆盖当前 nodes，这是「发布」最亮眼的能力。

**怎么做**：
- 入参 `{ kb_id, release_id }`
- 校验 release 属于该 kb
- 查出该 release 下所有 `node_releases` 快照（`kb_release_node_releases` 关联），对每个快照执行：
  ```sql
  UPDATE nodes SET name=?, meta=?::jsonb, content=?, visibility=?, type=?, parent_id=?, position=?, status=2, updated_at=? WHERE id=? AND kb_id=?
  ```
- 快照里有的节点，若原节点不存在则跳过（不新建，避免意外增文档）
- 回滚后清理该 kb 全部向量（`DELETE FROM node_embeddings WHERE kb_id=?`）→ 调 `embeddingService.ensureIndexed(kbId)` 重新向量化（失败不阻塞，打印 WARN，与现有发布逻辑一致）
- 返回 `{ release_id, rolled_back: N }`

### 3.4 后端：新增版本删除接口（新增 `DELETE /api/v1/knowledge_base/release`）

**为什么**：历史版本堆积需要清理入口。

**怎么做**：
- 入参 `{ kb_id, release_id }`（DELETE 用 query 参数或 request body 均可，前端用 DELETE + body 或 query）
- 仅允许删除"非当前版本"（当前版本 = 最新一条，删除会破坏快照完整性，直接拒绝并提示）
- 级联删除：
  ```sql
  DELETE FROM kb_release_node_releases WHERE release_id = ?
  DELETE FROM node_releases WHERE kb_id = ? AND id IN (SELECT node_release_id FROM kb_release_node_releases WHERE release_id = ?)
  DELETE FROM kb_releases WHERE id = ? AND kb_id = ?
  ```

### 3.5 前端 Admin：启用回滚/删除 + 适配列表结构（改 `release/index.tsx`、`VersionReset.tsx`、`VersionDelete.tsx`）

**为什么**：后端补齐后，前端把被注释的能力打开，并适配新列表结构。

**怎么做**：
- `release/index.tsx`：
  - 列表读取改为 `res.data.list`、`res.total`
  - `curVersionId` 取 `res.data.list[0].id`
  - 恢复「操作」列，显示「回滚 / 删除」按钮（当前版本行禁用删除）
- `VersionReset.tsx`：`submit()` 调 `POST /api/v1/knowledge_base/release/rollback`，成功后 `message.success` + `onClose` + `refresh()`
- `VersionDelete.tsx`：`submit()` 调 `DELETE /api/v1/knowledge_base/release`，成功后刷新
- 新增对应的 request 函数到 `web/admin/src/request/KnowledgeBase.ts`（仿照现有 `postApiV1KnowledgeBaseRelease` / `getApiV1KnowledgeBaseReleaseList` 的 httpRequest 写法）

### 3.6 后端：前台内容门禁（改 `ShareController.kt`，核心效果）

**为什么**：让「发布」真正决定前台内容——这是整个方案的核心价值。

**怎么做**：
- `nodeList`：SQL 增加过滤，**只隐藏未发布的文档、保留文件夹结构**（避免文件夹丢失导致目录树断裂）：
  ```sql
  WHERE kb_id = ? AND (status = 2 OR type = 1)
  ```
  - `type=1` 文件夹始终可见（结构稳定）；`type=2` 文档只有 `status=2` 可见
  - 原因：现有演示数据的文件夹可能是 `status=1`，严格按 `status=2` 过滤会导致整个目录树消失
- `nodeDetail`：查询后加判断——`type=2` 且 `status != 2` 的文档返回 `err("node not found")`（对访客隐藏）；`type=1` 文件夹不受限

> 说明：当前前台直接读 `nodes` 表（不读发布快照），门禁方案只加状态过滤，改动最小、可回退；读快照表的"严格快照模式"作为后续可扩展方向（见"假设与决策"）。

### 3.7 可选：侧边栏「发布」未发布角标（改 `Sidebar/index.tsx`）

**为什么**：运营视角需要"有东西待发布"的提醒。

**怎么做**：在发布菜单 label 旁渲染 `unpublished_count` 角标，数据来源 `GET /api/v1/node/stats?kb_id=`（`NodeController` 已实现 `unpublished_count`），切换知识库/发布后刷新。

---

## 四、假设与决策

1. **门禁采用"宽松过滤"而非"严格快照模式"**：前台仍读 `nodes` 表，仅过滤 `status=2`。理由：改动最小、兼容现有演示数据（文件夹 status 可能为 1）、不影响 Admin 编辑。答辩时可讲"这是内容门禁的第一阶段，后续可升级为直接读 `node_releases` 快照实现多版本并行展示"。
2. **回滚写回 `nodes` 表**而非切换前台读取源：与现状一致，回滚后前台立即看到历史内容。
3. **删除仅限非当前版本**：保护最新快照不被误删，当前版本删除需先发布新版本。
4. **发布者取 JWT 用户**：无 token 发布时 publisher 留空，不阻塞。
5. **不新建任何数据库迁移**：`publisher_id` 等字段已存在于现有 schema，本方案零 DDL。
6. **范围控制**：不做版本间 diff 对比、不做定时自动发布、不改发布快照表结构——超出本次"落地效果"目标。

---

## 五、验证步骤

1. **编译**：`cd /d E:\PandaWiki\backend-java && gradlew.bat compileJava compileKotlin -q --no-daemon`
2. **重启后端**：停止 8080 旧进程，重新 `gradlew.bat bootRun --no-daemon`（或用户自己启动）
3. **APIfox/curl 验证接口**：
   - `POST /api/v1/user/login` 拿 JWT（admin/admin123）
   - `GET /api/v1/knowledge_base/release/list?kb_id=xxx&page=1&per_page=20` → 返回 `data.list` + `total` + `publisher_account`
   - `POST /api/v1/knowledge_base/release/rollback` body `{kb_id, release_id}` → 返回 rolled_back 数量，前台对应文档内容变为该版本内容
   - `DELETE /api/v1/knowledge_base/release?kb_id=xxx&release_id=yyy` → 非当前版本删除成功、当前版本返回拒绝提示
4. **门禁验证**：
   - 建一篇草稿/修改已发布文档不重新发布 → `GET /share/v1/node/list`、`/share/v1/node/detail` 看不到该文档；发布后可见
   - 文件夹（type=1）不受影响，目录树完整
5. **前端验证**：Admin 发布页发布新版本 → 列表出现发布者/总数/分页正常；回滚/删除按钮可用；App 前台刷新验证门禁
6. **收尾**：记录操作到 `others/oprater.md`，把"发布链路/门禁/回滚"讲法写入 `others/bishe.md`

---

## 六、答辩可讲点（写入 bishe.md）

1. **内容生命周期**："发布是编辑态到线上态的唯一闸门，未发布内容前台永远看不到，这就是内容门禁"
2. **版本快照 + 回滚**："每次发布生成全量快照到 `node_releases`，回滚就是拿历史快照覆盖当前内容，改坏了能一键回到任意版本"
3. **发布者溯源**："发布记录带发布人，配合 `publisher_id`，谁发布了什么版本一目了然"
4. **分层查询设计**："前台读 `nodes` 但加 `status=2` 过滤实现门禁，文件夹始终保留保证目录树稳定——这是内容门禁的轻量实现，后续可升级为直接读快照表"
5. **踩坑/经验**："前端发布列表字段与后端返回结构不一致（`res.data` vs `res.data.list`、缺 `total`）导致总数恒为 0，排错时先看接口返回结构再对前端"
