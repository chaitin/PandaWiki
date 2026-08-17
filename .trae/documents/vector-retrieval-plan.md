# 智能问答向量检索（embedding 相似度）实现计划

## Summary（概述）
把 App 前台的智能问答检索从"关键词 ILIKE 模糊匹配"升级为**向量检索**：文档内容先通过 embedding 模型转成向量入库，问答时把用户问题也转成向量，在 Java 内存里算余弦相似度，取最相关的文档喂给大模型，消除"文档里有答案但 AI 答不上来/幻觉"的问题。

## Current State Analysis（现状分析）
- [ChatController.kt](e:/PandaWiki/backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ChatController.kt) 的 `searchNodes()` 用 `name ILIKE '%整句问题%' OR content ILIKE '%整句问题%'` 检索。整句问题太长，`content` 里通常只有片段（如"谭玉妃"），导致检索为空 → AI 无上下文 → 幻觉。
- [ModelService.kt](e:/PandaWiki/backend-java/src/main/kotlin/com/chaitin/pandawiki/service/ModelService.kt#L88) 已有 `embedding(text): FloatArray`，走 OpenAI 兼容协议（`POST {base_url}/embeddings`），且用户确认 Admin 已配置好 embedding 模型（如硅基流动 BAAI/bge-m3）。
- `nodes` 表（[Node.java](e:/PandaWiki/backend-java/src/main/java/com/chaitin/pandawiki/entity/Node.java)）**没有向量列**，需要新建表存向量。
- Flyway 已启用（`spring.flyway.enabled=true`，[application.yml:26](e:/PandaWiki/backend-java/src/main/resources/application.yml#L26)），新增 migration 脚本随后端启动自动执行。
- Go 版参考实现（`usecase/llm.go GetRankNodes`）走 raglite 向量库 + `SimilarityThreshold: 0.2`；**Java 版不使用 Go 代码，仅借鉴"向量相似度检索"思路**。

## Proposed Changes（具体改动）

### 1. 新增数据库表：`node_embeddings`（新建文件）
**文件**：`backend-java/src/main/resources/db/migration/V2__node_embeddings.sql`

```sql
CREATE TABLE IF NOT EXISTS node_embeddings (
    id           text NOT NULL,
    node_id      text NOT NULL,
    kb_id        text NOT NULL,
    chunk_index  int  NOT NULL DEFAULT 0,
    chunk_text   text NOT NULL,
    embedding    float8[] NOT NULL,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_node_embeddings_kb_id ON node_embeddings(kb_id);
CREATE INDEX IF NOT EXISTS idx_node_embeddings_node_id ON node_embeddings(node_id);
```
- **为什么**：`nodes` 表不动，向量独立存储，避免污染业务表；`float8[]` 是 PG 原生数组类型，不依赖 pgvector 扩展（当前镜像 `postgres:16-alpine` 没有 pgvector）。
- **说明**：一篇已发布文档（node）生成 1 条向量记录（`chunk_index=0`，chunk_text 存文档 content 前 2000 字，避免超 token）。

### 2. 新增向量服务：`EmbeddingService`（新建文件）
**文件**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/service/EmbeddingService.kt`

职责（注入 `JdbcTemplate`、`ModelService`）：
- `fun reindexKb(kbId: String): Int`：删掉该 kb 旧向量 → 查 `nodes WHERE kb_id=? AND status=2 AND type=2` → 逐篇调用 `modelService.embedding(content)` → 批量写入 `node_embeddings`。返回向量化条数。
- `fun ensureIndexed(kbId: String): Boolean`：`SELECT count(*) FROM node_embeddings WHERE kb_id=?`，为 0 则调 `reindexKb` 自动补齐（懒加载，首次问答自动向量化）。
- `fun search(kbId: String, query: String, topK: Int = 5): List<NodeChunk>`：
  1. `modelService.embedding(query)` 得到问题向量
  2. 拉该 kb 全部向量 + 对应 node 的 id/name/content/meta
  3. 内存计算**余弦相似度**（手写 `cosine(a,b)`，无第三方依赖）降序排序
  4. 取 topK 组装为 `NodeChunk`（与现有返回结构一致）
- 所有 embedding 模型调用失败时**抛异常**，由调用方（ChatController）捕获后降级。

**为什么内存算相似度**：毕设数据量小（几十上百篇文档），全量拉出算余弦足够快；不引入向量数据库依赖，实现简单、答辩好讲。

### 3. 改造检索入口：`ChatController`（修改现有文件）
**文件**：`backend-java/src/main/kotlin/com/chaitin/pandawiki/controller/ChatController.kt`

- `searchNodes(kbId, keyword)` 改为：
  1. 先调 `embeddingService.ensureIndexed(kbId)`（自动补向量）
  2. 再调 `embeddingService.search(kbId, keyword, topK=5)` 返回向量检索结果
  3. **catch 异常时降级**：回退到现有 `ILIKE` 关键词检索（保留原逻辑），保证 embedding 模型挂了也能用
- 新增接口 `POST /share/v1/chat/reindex`：接收 `x-kb-id`，调 `reindexKb` 全量重建向量，返回 `{success, code, message, data:{count}}`，供测试/Admin 手动重建。
- 删除临时 `println` 调试日志和原生 SQL 拼接测试代码。

### 4. 前端（无需改动）
App 前台 `POST /share/v1/chat/message` 的请求/响应格式不变，`chunk_result` 事件照常返回，前端自动展示检索到的文档。

## Assumptions & Decisions（假设与决策）
- **embedding 模型已配置**（用户确认）：Admin 里存在 `type=embedding` 且 `is_active=true` 的模型，`ModelService.embedding()` 可直接调用。
- **向量生成时机**：首次问答自动全量向量化（懒加载）+ 提供 `reindex` 接口手动重建；不做"发布时自动生成"（侵入 NodeController 流程，改动大）。
- **一篇文档一条向量**：不拆多个 chunk，chunk_text 截取 content 前 2000 字符，控制 embedding 调用量和 token 成本。
- **不使用 pgvector**：镜像无该扩展，改用 `float8[]` + Java 内存余弦。
- **embedding 失败降级**：不影响原有 ILIKE 搜索和问答可用性。

## Verification（验证步骤）
1. 用户 cmd 重启后端（migration 自动建表）：
   ```
   .\gradlew.bat bootRun --no-daemon
   ```
2. 用 curl 触发全量向量化（在 cmd，UTF-8 body）：
   ```
   curl -s -X POST http://localhost:8080/share/v1/chat/reindex -H "x-kb-id: 45aadf70-7c1a-45cf-ae10-62656e134d7b"
   ```
   预期返回 `count >= 1`。
3. 智能问答发送"谭玉妃会发财吗"，EventStream 应出现 `chunk_result` 事件，返回 `lala` 文档；AI 回答应基于文档内容而非幻觉。
4. 验证降级：临时把 embedding 模型 `is_active` 置 false 再问答，应回退 ILIKE 仍能工作（可选）。
