# 方向三：统计/数据分析 — Java 后端补齐方案

## 1. 方案摘要

在 **Java 后端（`backend-java`）** 补齐 Admin 统计看板所需的全部后端接口，让现有 `web/admin/src/pages/stat` 页面（ECharts 可视化）能够直接对接 Java 8080 端口。核心覆盖你提到的三类价值：

- **问答次数统计**：`conversation_count` 汇总、近 N 天趋势、问答来源分布。
- **热门问题统计**：新增「热门问题 TopN」接口与前端卡片（当前 Go 后端也无此维度，是答辩亮点）。
- **用户访问统计**：IP / Session / 页面访问（PV）/ 实时来访 / 地理分布 / 来源域名 / 客户端分布 / 热门文档。

**不改动 Go 后端**，仅把它作为逻辑参考；数据库表由现有 Flyway 迁移脚本提供，无需新建表。

---

## 2. 现状分析

### 2.1 已有基础（可直接复用）

| 层级 | 现状 | 关键文件 |
|------|------|----------|
| 数据库表 | `stat_pages`（原始访问日志）、`stat_page_hours`（小时聚合）、`node_stats`（文档累计 PV）、`conversations` / `conversation_messages`（问答）已存在 | `backend-java/src/main/resources/db/migration/V1__init_schema.sql` 来源 000009 / 000023 / 000034 |
| Admin 前端 | 统计页、ECharts 组件、API 封装均已实现，当前因 Java 后端无接口而 404 | `web/admin/src/pages/stat/Statistic/*`、`web/admin/src/request/Stat.ts` |
| Java 后端模式 | 已使用 `JdbcTemplate` + Kotlin/Java Controller + `JwtService` 鉴权，可直接沿用 | `NodeController.java`、`ConversationController.kt`、`JwtService.java` |
| 前端请求封装 | `Stat.ts` 为 swagger-typescript-api 生成，期望 `{success, code, message, data}` 或 `DomainPWResponse` 格式 | `web/admin/src/request/Stat.ts`、`web/admin/src/request/httpClient.ts` |

### 2.2 缺失部分

- Java 后端无 `/api/v1/stat/**` 任何接口。
- 前台访问日志上报接口 `POST /share/v1/stat/page` 未实现，导致 `stat_pages` 无数据，统计看板为空。
- 无「热门问题」维度接口。

### 2.3 参考实现（只读，不直接复制）

Go 后端完整实现了同样接口，可作为逻辑参考：

- Handler：`backend/handler/v1/stat.go`
- UseCase：`backend/usecase/stat.go`
- Repo：`backend/repo/pg/stat.go`、`backend/repo/pg/stat_hour.go`
- 领域模型：`backend/domain/stat.go`

---

## 3. 具体改动清单

### 3.1 新增 DTO / 请求响应类

文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/dto/StatDtos.kt`

- `StatCountReq`：`kb_id: String`, `day: Int`（1/7/30/90，默认 1）
- `StatInstantReq`：`kb_id: String`
- `StatHotPagesReq` / `StatRefererReq` / `StatBrowsersReq` / `StatGeoReq` / `StatConversationDistributionReq`：同上
- `StatCountResp`：`ip_count`, `session_count`, `page_visit_count`, `conversation_count`
- `InstantCountResp`：`time`, `count`
- `InstantPageResp`：`scene`, `node_id`, `node_name`, `ip`, `ip_address`, `created_at`, `user_id`, `info`
- `HotPageResp` / `HotRefererResp` / `HotBrowserResp`：与 Go 的 `HotPage`、`HotRefererHost`、`HotBrowser` 字段一致
- `ConversationDistributionResp`：`app_type`, `count`
- `GeoCountResp`：地图省份 -> 数量
- `HotQuestionResp`：`question`, `count`（新增）
- `RecordPageReq`：`scene: Int`, `node_id: String?`

### 3.2 新增 Service 层（可选但推荐）

文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/service/StatService.kt`

职责：

- 封装所有聚合 SQL。
- 处理时间窗口计算（近 1/7/30/90 天）。
- 处理 `stat_pages` 与 `stat_page_hours` 的查询优先级：实时/当天查 `stat_pages`，历史查 `stat_page_hours`。
- 简易 UA 解析（browser + os）。
- 简易 IP 归属地解析（可用离线库或正则/段表，答辩阶段可先实现省份维度）。

### 3.3 新增 Controller

文件：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/StatController.kt`

路由与对应前端组件：

| 路由 | 方法 | 说明 | 前端消费 |
|------|------|------|----------|
| `GET /api/v1/stat/count` | `count(req)` | IP/Session/PV/问答数 | `TypeCount.tsx` |
| `GET /api/v1/stat/instant_count` | `instantCount(req)` | 近 60 分钟每分钟访问量 | `RTVisitor.tsx` |
| `GET /api/v1/stat/instant_pages` | `instantPages(req)` | 最近 10 条访问记录 | `RTVisitor.tsx` |
| `GET /api/v1/stat/geo_count` | `geoCount(req)` | 用户地理分布 | `AreaMap.tsx` |
| `GET /api/v1/stat/conversation_distribution` | `conversationDistribution(req)` | 问答来源分布 | `QAReferer.tsx` |
| `GET /api/v1/stat/hot_pages` | `hotPages(req)` | 热门文档 Top10 | `HotDocs.tsx` |
| `GET /api/v1/stat/referer_hosts` | `refererHosts(req)` | 来源域名 Top10 | `HostReferer.tsx` |
| `GET /api/v1/stat/browsers` | `browsers(req)` | 浏览器/OS 分布 | `ClientStat.tsx` |
| `GET /api/v1/stat/hot_questions` | `hotQuestions(req)` | 热门问题 Top10（新增） | 新增组件 `HotQuestions.tsx` |
| `POST /share/v1/stat/page` | `recordPage(req)` | 前台/挂件上报页面访问 | App、Widget 页面 |

#### 鉴权约定

- 管理端 `/api/v1/stat/**`：使用 `JwtService.parseBearer` 校验登录态（与 `NodeController` 等保持一致）。
- 前台 `/share/v1/stat/page`：可公开，但读取 `x-kb-id` 或 URL 参数 `kb_id`。

### 3.4 前台访问日志埋点

需要确认并补上报调用点：

1. **App 前台欢迎页/问答页**：在加载时调用 `POST /share/v1/stat/page`。
2. **Widget 挂件**：打开聊天窗口时上报。
3. **Admin 编辑器文档详情页**：查看文档时上报（可选，因为 Admin 访问通常不计入运营统计）。

埋点逻辑参考 Go：`backend/handler/share/stat.go` 的 `RecordPage`，写入字段：

```
kb_id, node_id, user_id, session_id, scene, ip, ua,
browser_name, browser_os, referer, referer_host, created_at
```

### 3.5 Admin 前端新增「热门问题」卡片

文件：`web/admin/src/pages/stat/Statistic/HotQuestions.tsx`（新增）

- 调用 `GET /api/v1/stat/hot_questions?kb_id=xxx&day=1|7|30|90`
- 使用现有 `Card` 组件 + 简单列表/进度条展示 Top10。
- 在 `Statistic/index.tsx` 的底部 Stack 中加入 `<HotQuestions tab={tab} />`。

### 3.6 类型声明补充

由于 `web/admin/src/request/types.ts` 是 swagger-typescript-api 生成的，新增 `HotQuestionsResp` 不会自动生成。方案：

- 在 `web/admin/src/request/Stat.ts` 同级新增 `StatExtra.ts`，手写 `hotQuestions` 调用；或
- 在 `types.ts` 中手动追加类型（标记为手动补充，后续 Swagger 重新生成时需保留）。

推荐方案一，避免污染生成文件。

---

## 4. 关键 SQL 策略

### 4.1 时间窗口

```sql
-- day = 1 时从 now() - interval '1 day' 开始
-- day = 7 时从 now() - interval '7 days' 开始
-- 以此类推
```

### 4.2 count 汇总

```sql
SELECT
  COUNT(DISTINCT ip)      AS ip_count,
  COUNT(DISTINCT session_id) AS session_count,
  COUNT(*)                AS page_visit_count
FROM stat_pages
WHERE kb_id = ? AND created_at >= ?;

SELECT COUNT(*) AS conversation_count
FROM conversations
WHERE kb_id = ? AND created_at >= ?;
```

### 4.3 hot_pages（热门文档）

```sql
SELECT node_id, COUNT(*) AS count
FROM stat_pages
WHERE kb_id = ? AND created_at >= ? AND node_id IS NOT NULL AND node_id != ''
GROUP BY node_id
ORDER BY count DESC
LIMIT 10;
```

回查 `nodes.name` 补 `node_name`。

### 4.4 hot_questions（热门问题）

```sql
SELECT content AS question, COUNT(*) AS count
FROM conversation_messages
WHERE kb_id = ? AND role = 'user' AND created_at >= ?
  AND content IS NOT NULL AND content != ''
GROUP BY content
ORDER BY count DESC
LIMIT 10;
```

答辩场景下可先用「完全相同的用户问题」去重；如需语义聚类，可后续升级为关键词提取/向量聚类。

### 4.5 referer_hosts / browsers

- `referer_hosts`：对 `stat_pages.referer_host` 分组计数 Top10。
- `browsers`：分别对 `browser_name`、`browser_os` 分组计数，返回 `{os: [...], browser: [...]}`。

### 4.6 instant_count

```sql
SELECT date_trunc('minute', created_at) AS time, COUNT(*) AS count
FROM stat_pages
WHERE kb_id = ? AND created_at >= now() - interval '1 hour'
GROUP BY time
ORDER BY time ASC;
```

Java 端再补全缺失分钟为 0，最终返回 60 条。

### 4.7 geo_count

方案 A（答辩推荐，简单可讲）：

- 在 `stat_pages` 中新增/使用 `ip_address` JSONB（或单独字段）记录省份。
- 首次埋点时解析 IP 省份写入；统计时直接分组。

方案 B（与 Go 对齐）：

- 使用离线 IP 库实时解析。

建议先用方案 A，后续可切换。

---

## 5. 数据准确性保障

### 5.1 埋点是前提

- 若 `POST /share/v1/stat/page` 未接入，所有访问类统计为空。
- 需在 App 路由入口、Widget 打开处补调用。

### 5.2 时间对齐

- 数据库使用 `timestamptz`，Java 使用 `OffsetDateTime`。
- 统计按 `created_at >= ?` 过滤，不往前推到当天 00:00，与「近 N 天」语义一致。

### 5.3 版本权限

- 前端 `TimeList` 中 7/30/90 天带版本锁，但后端做基础校验即可（非本次重点）。

---

## 6. 假设与决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 后端语言 | Java/Kotlin 后端 | 与答辩主版本、当前启动的 8080 端口一致 |
| 前端方案 | 复用现有 Admin 统计页 | 已有 ECharts 组件，降低前端工作量 |
| 新增维度 | 热门问题 Top10 | 直接对应你的需求，且 Go 后端也没有，能体现增量工作 |
| 地理分布实现 | 先写入省份字段再聚合 | 简单、可控、答辩时可完整讲清链路 |
| 数据聚合层 | JdbcTemplate 原生 SQL | 与 `NodeController.stats()` 一致，聚合性能可控 |
| 访问日志 | 由前台主动上报 | 与 Go 实现保持一致，避免后端反向代理日志复杂化 |

---

## 7. 实施步骤（建议顺序）

1. **新增 DTO**：`StatDtos.kt`
2. **新增埋点接口**：`POST /share/v1/stat/page`
3. **前台补埋点**：App/Widget 页面加载时调用
4. **新增 count / instant 接口**：让 TypeCount、RTVisitor 先有数
5. **新增 hot_pages / referer_hosts / browsers / geo / conversation_distribution**：补齐图表
6. **新增 hot_questions 接口 + 前端卡片**
7. **造数据 + 联调**：手动访问、手动聊天，验证 Admin 统计页各图表
8. **整理答辩讲述点**：写入 `E:\PandaWiki\others\bishe.md`

---

## 8. 验证清单

- [ ] 启动 Java 后端不报错，Flyway 无需新迁移。
- [ ] `POST /share/v1/stat/page` 用 curl 返回 200，数据库 `stat_pages` 新增记录。
- [ ] 访问 App 前台后，Admin 统计页「实时来访」出现数据。
- [ ] 进行一次 AI 问答后，「问答次数」+1，「问答来源」出现 Web/Widget 分布。
- [ ] 热门文档、来源域名、客户端统计有数据。
- [ ] 新增「热门问题」卡片展示用户问得最多的 Top10 问题。
- [ ] 刷新 Admin 页面即可看到更新（无需重启前端 dev server，仅重跑 Java 后端）。

---

## 9. 风险与简化点

| 风险 | 简化处理 |
|------|----------|
| IP 归属地解析复杂 | 埋点时解析一次并写入字段；先支持省份/中国维度 |
| UA 解析库引入 | 使用正则或简单字符串匹配；足以支撑答辩 |
| 实时 60 分钟补 0 逻辑 | Service 层用 Map 填充缺失分钟 |
| 热门问题语义去重 | 第一期用精确匹配；后续可升级 |

---

## 10. 后续可扩展

- 接入离线 IP 库（如 ip2region）做更准的地理分布。
- 对热门问题做向量化聚类，合并相似问法。
- 增加「Token 消耗统计」「用户反馈统计（点赞/点踩）」等运营指标。
- 增加导出 Excel/CSV 功能。
