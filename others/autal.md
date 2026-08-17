# PandaWiki 项目架构与重构规划（中文大白话版 · 小白也能看懂）

> 🍼 **阅读说明**：所有专业术语第一次出现都标了【白话解释】，每个功能都配了「举个栗子🌰」，不懂的词放心看括号里的翻译。

---

## 一、项目速览（先搞明白这是啥）

### 1.1 PandaWiki 是个什么产品？

**一句话讲明白**：**PandaWiki = 一个带 AI 智能问答的企业知识库 / 团队文档系统**。

🌰 举个栗子：
- 你公司把产品手册、员工手册、客服话术、项目文档…全部上传到 PandaWiki
- 新人入职不用追着老员工问，直接查 Wiki
- 客户问问题，客服直接搜 Wiki 里的标准答案
- **最核心的 AI 功能**：员工直接问「我们公司年假怎么规定的？」，AI 自动在 Wiki 里找答案引用原文给你，不用自己翻 100 页文档

### 1.2 当前在做的「重构」是什么？

**一句话讲明白**：**后端代码从 Go 语言 → 换成 Java 语言，前端网页（管理后台 + Wiki 前台）一行不改或只改一丢丢。**

> 就像「一家餐馆原来请的四川厨师（Go），现在换成粤菜厨师（Java），但菜单、菜名、上菜方式、装修全都不变，客人来了完全感觉不到区别。」

### 1.3 当前进度（2026-08-05）

| 阶段 | 做了什么 | 状态 |
|---|---|---|
| 阶段 0~2 | 基础决策确认 + 项目骨架 + 用户/权限/知识库/文档节点模块 | ✅ 已完成 |
| **阶段 3** | **AI 模型配置 + AI 对话 + AI 创作功能** | **🔴 下一个要做的** |
| 阶段 4~7 | 抓取导入/文件/机器人/前台共享/全量对接… | 🟡 后面做 |

---

## 二、痛点确认（两层：产品层 + 技术层）

### 2.1 第一层：PandaWiki 产品帮「用户/公司」解决了什么痛点？

> 🎯 **产品解决的是「公司知识管理混乱」的问题，下面是 6 个常见企业真实场景：**

| 编号 | 公司原来的痛点（没 PandaWiki 时） | PandaWiki 怎么解决 |
|---|---|---|
| U1 | **文档散落一地找不到**：产品手册在飞书、制度邮件里、项目文档在 Notion、客户问题靠口口相传…员工找个答案要半小时 | **统一知识库**：所有文档集中存 PandaWiki，分门别类（知识库 → 文件夹 → 文档三级），搜索 1 秒出结果 |
| U2 | **新人培训没人管**：新入职员工要拉一堆老员工「拜师」，老员工重复回答同样的问题，时间都浪费了 | **自助学习**：新人自己看 Wiki，AI 问答「咱们产品怎么退款？」秒出标准答案，培训成本降 80% |
| U3 | **客服回答不统一**：10 个客户问同一个问题，3 个客服说 3 个答案，客户投诉 | **标准答案库**：把官方话术存进 Wiki，客服搜就有；AI 问答直接引用原文，100% 合规 |
| U4 | **人走知识走**：核心员工离职，脑袋里的经验/客户资料/项目细节全带走了，交接要几个月 | **沉淀=资产**：所有知识写进 Wiki，离职带不走，新人打开 Wiki 就能接着干，知识变成公司资产 |
| U5 | **文档安全没保障**：Excel/Word 文档发群里，谁都能下载、外传，核心资料泄露了根本不知道 | **4 级权限控制**：谁能看、谁能改、谁能下载、能不能让外部客户访问，全部可控；还能设密码/企业 SSO 登录 |
| U6 | **文档几百页，找一句话想死**：一份产品手册 300 页，找某条规则翻半天 | **AI 语义搜索**：直接问自然语言「XX 套餐支持退款吗？」，AI 帮你定位到具体段落 + 高亮原文 |

---

### 2.2 第二层：为什么把后端从「Go 语言」重构为「Java 语言」？

> 🛠️ **技术层解决的是「公司维护 Go 代码太难、风险太高」的问题：**

| 编号 | Go 版本的痛点（维护团队难受的地方） | 换成 Java 后的好处 |
|---|---|---|
| T1 | **ModelKit v2 是闭源黑盒**：50 多家 AI 厂商（OpenAI/豆包/DeepSeek…）的适配依赖一个闭源 SDK，出 bug 没人修、Java 又没同款 | **自研 ModelProvider 接口层**：自己写适配代码，每家厂商都是 OpenAI 兼容协议，可控可扩展，谁都不依赖 |
| T2 | **团队技术栈不匹配**：公司开发人员 90% 只会 Java，Go 没人会，招一个会 Go 的又贵又难招 | **统一 Java 栈**：随便拉一个 Java 开发 1 天就能上手维护，招聘成本砍一半 |
| T3 | **依赖注入/测试太弱**：Google Wire 是编译期生成代码，想灵活替换个 Mock 做单元测试特别费劲 | **Spring IoC + Mockito**：Spring 生态原生支持，写单元测试/集成测试几行注解搞定 |
| T4 | **SSE 流式不稳**：AI 对话打字机效果用 Echo SSE，100 人同时聊偶尔断连，用户要重连好几次 | **Spring SseEmitter + 虚拟线程**：Java 21 虚拟线程 IO 性能翻倍，高并发下更稳，调试也方便 |
| T5 | **权限加新维度要改核心链路**：现在是「全局角色 + KB 权限」，想加「租户隔离」「部门权限」要改 10 几个文件，容易改崩 | **Spring Security SPEL 注解式权限**：加个 `@PreAuthorize("@pms.xxx")` 就行，权限维度想加几个加几个，不碰核心代码 |
| T6 | **排查生产问题像算命**：Sentry + OTEL 链路接不完整，出了 500 错误要翻好几份日志，半小时找不到根因 | **Micrometer + Actuator**：指标/日志/链路三件套一体化，哪个接口慢、哪条 SQL 卡、哪个节点报错，Dashboard 一页看完 |
| T7 | **事务一致性全靠人记**：跨两张表写数据，程序员忘了开事务，用户付了钱订单没生成，甩锅半天 | **`@Transactional` 声明式事务**：方法上加个注解，Spring 自动帮你开/关/回滚事务，想忘都忘不了 |

---

## 三、边界划分（管啥？不管啥？别搞混了）

> 🗺️ **先把「后端 Java 代码」要做的、不做的画清楚，别啥活都往自己身上揽：**

### ✅ 3.1 Java 后端要做的事（In Scope）

| 类别 | 具体做啥（白话版） |
|---|---|
| 业务 API 接口 | 接收前端 3 种请求：管理后台 `/api/v1/*`、Wiki 前台 `/share/v1/*`、第三方系统 `/openapi/v1/*`，处理后返回 JSON 数据 |
| 数据存和取 | 往 PostgreSQL 数据库里增删改查、保证多条 SQL 要么全成功要么全失败（事务）、用 Flyway 版本化管理建表脚本 |
| 缓存和会话 | 热点数据存 Redis 加快访问（比如查知识库列表不用每次查数据库）、记住登录状态（用户关页面再打开不用重登） |
| 消息队列生产消费 | 文档保存后→丢一条消息进 NATS→后台消费者慢慢调 AI 向量学习，不让用户等 |
| 鉴权和安全 | 登录接口校验密码、每个请求检查你有没有权限、密码输错 5 次锁定半小时、XSS/SQL 注入拦截 |
| AI 适配层 | 统一 ModelProvider 接口接 OpenAI/DeepSeek/百智云/Ollama 等，Token 计数用来算费用 |
| SSE 流式输出 | AI 回答像聊天软件一样「一个字一个字蹦出来」（打字机效果），不是等半分钟整段返回 |
| 文件上传代理 | 用户传图片/附件→后端签 S3 凭证→传 MinIO，校验格式/大小/病毒后缀 |
| 定时任务 | 每小时跑一次统计 PV/UV、每天检查授权是否过期、每 10 分钟扫一次失败的文档向量化 |

### ❌ 3.2 Java 后端**不做**的事（Out of Scope，丢给别人）

| 类别 | 丢给谁做 | 白话解释 |
|---|---|---|
| 网页渲染、HTML 返回 | 前端：React（管理后台）+ Next.js（Wiki 前台） | 后端纯「API 服务员」，只返回 JSON 数据，不管页面长啥样、按钮放哪 |
| 向量检索 / Embedding 计算 | **外部 ct-rag 服务（单独部署的 HTTP 服务）** | 「把文档切成小块 → 算向量 → 存向量库 → 相似度搜索」这一整套全是 ct-rag 干，后端只调它的 HTTP 接口 |
| 文档分块 / Rerank | 同上 ct-rag | 后端只负责把文档内容发给 ct-rag，它分块算好了告诉后端结果，后端回写状态 |
| 前端怎么处理流式回答 | 前端 `eventSource` / `ReadableStream` | 后端保证事件格式是 `data: xxx` 就行，前端收到了怎么渲染成打字机效果前端自己搞定 |
| 前端请求 TypeScript 类型生成 | 前端工具 `cx-swagger-api` | 后端输出标准 OpenAPI 3.0 JSON，前端工具自动读 JSON 生成 TS 类型，后端不用写 TS |
| 网关 / SSL 证书 / CORS 跨域 | Nginx / Caddy 反向代理 | 生产环境 HTTPS 证书、跨域白名单、负载均衡全是网关干，Spring 只管白名单配置 |
| 文件病毒查杀 | 可选独立服务（可选） | 后端只校验扩展名是不是 `.exe/.bat` 这种危险后缀 + 限制大小，真要扫病毒单独部署杀毒服务 |

---

## 四、架构风格 + 代码目录（每个目录都翻译）

**选型：经典三层单体架构（分层分包）**

> 🏢 **用人话打比方**：后端代码就像一家餐馆，分 3 层——
> - **Controller = 前台接待员**：接客人（请求）、点单（参数）、端菜（响应）
> - **Service = 后厨厨师长**：按菜单做菜（业务逻辑）、需要啥食材让仓库管理员拿、保证菜是热的（事务）
> - **Repository = 仓库管理员**：只管去冷库（数据库）拿食材/放食材、怎么拿最快（缓存）他最清楚

```
backend-java/
│
├── controller/          ← 【前台接待层】接请求、校验参数、返回响应
│   ├── v1/              ← 管理后台接口  /api/v1/*
│   ├── share/           ← Wiki 前台共享接口 /share/v1/*
│   └── openapi/         ← 第三方系统接口 /openapi/v1/*
│
├── service/             ← 【厨师长·业务层】所有业务逻辑在这里，事务边界（一道菜一个事务）
│   ├── impl/            ← 业务实现类（真的做菜的厨师）
│   └── spec/            ← 业务接口（菜单，写着能做什么菜）
│
├── repository/          ← 【仓库管理员·数据层】和数据库/Redis/MQ 打交道
│   ├── pg/              ← PostgreSQL 数据存取
│   ├── cache/           ← Redis 缓存封装
│   └── mq/              ← NATS 消息发送封装
│
├── entity/              ← 【食材·数据模型】对应数据库一张表的一行数据（JPA Entity）
│   ├── base/            ← 基类：所有表都有的字段（主键ID、创建时间、更新时间）
│   └── converter/       ← 转换器：PG 的 JSONB ↔ Java 的 Map 对象
│
├── dto/                 ← 【传菜盘·数据传输对象】请求参数/返回结果（和 Go 版字段 1:1，前端不改）
│   ├── request/         ← 请求 DTO（客人的点菜单）
│   └── response/        ← 响应 DTO（炒好的菜+统一盘子 PWResponse）
│
├── config/              ← 【餐厅管理层】各种配置类：Security 保安、Redis 冷库地址、NATS 订单机…
│
├── common/              ← 【公共工具房】所有模块都能用的工具
│   ├── security/        ← 🔐 保安部：JWT 通行证生成校验、权限判断 Bean、401/403 拦截回复
│   ├── exception/       ← ⚠️ 投诉处理：全局异常捕获 + 错误码枚举
│   ├── model/           ← 🤖 AI 适配：ModelProvider 接口 + 5 家厂商实现
│   └── util/            ← 🔧 工具箱：double 排序算法、BCrypt 密码加密、对象拷贝
│
└── PandaWikiApplication.java  ← 【老板办公室】Spring Boot 启动类（开餐馆的钥匙）
```

### ❓ 为什么不选「六边形架构/Clean 架构」？
1. Go 版本来就是经典三层，团队熟，切换成本最低
2. 六边形要分 `domain/application/infrastructure/adapter` 四层，学习成本高，18 个模块要做慢一倍
3. **现在第一目标是「功能 100% 平移过去」，不是炫技架构**，等迁完稳定了再演进不迟

---

## 五、技术栈选型（每个组件都讲明白：它是干嘛的？）

> 🧱 **核心原则：Spring Boot 3 原生生态优先，少引入第三方框架，少一个依赖少一个坑。**
>
> 🗺️ **运行拓扑图（必须启动的 5 个东西）**：
> ```
> 前端(浏览器)  ←HTTPS→  Nginx网关  ←HTTP→  Java后端(Spring Boot)
>                                              ↑↑↑↑
>                                        PostgreSQL(主数据库)
>                                        Redis(缓存/记住登录)
>                                        NATS(消息队列·文档学习)
>                                        MinIO/S3(文件/图片存储)
>                                        ct-rag(外部AI向量服务·另外部署)
> ```

| 层级 | 最终选型 | 【白话解释】它是干嘛的 | 为什么不选别的 |
|---|---|---|---|
| 🟢 语言 | **Java 21 LTS** | 写代码的语言，长期支持到 2031 年 | Java 17 也行，但 21 有虚拟线程，IO 密集（SSE/DB/Redis）性能翻倍 |
| 🟢 构建工具 | **Gradle Kotlin DSL** | 管依赖包、编译打包、跑测试的工具 | Maven 也行但 Gradle 有构建缓存，打包快 2~5 倍；Kotlin 写配置还有代码提示 |
| 🟢 Web 框架 | **Spring Boot 3 Web MVC** + 虚拟线程 | 接收 HTTP 请求、路由到 Controller 的主框架 | WebFlux 响应式太复杂，调试起来像玄学；MVC + 虚拟线程 = 简单又快 |
| 🟢 ORM 框架 | **Spring Data JPA + Hibernate 6** | 不用手写 SQL，写 Java 代码自动帮你增删改查 | MyBatis-Plus 要写 XML SQL，累；JPA 95% 场景零 SQL，还自带 PostgreSQL JSONB 支持 |
| 🟢 主数据库 | **PostgreSQL 16** | 存所有业务数据（用户/文档/对话…） | MySQL 也行但 JSONB/GIN 索引没 PG 强，现在数据全在 PG 换不动 |
| 🟢 数据库连接池 | **HikariCP** | 管数据库连接的池子，避免每次请求都重新连 | Spring Boot 默认自带，性能是连接池天花板，不用瞎折腾 |
| 🟢 缓存客户端 | **Spring Data Redis (Lettuce)** | 操作 Redis 的工具 | Redisson 功能强但重，先够用；以后要分布式锁再单独引 Redisson-core |
| 🟢 会话(记住登录) | **Spring Session Data Redis** | 登录状态存在 Redis 里，Cookie 存个钥匙 | 自研 JWT Cookie 也行，但 Go 版本来就是 Redis Session，保持一致不折腾用户重登 |
| 🟢 消息队列 | **NATS 2.x（Spring NATS）** | 文档向量化异步解耦（存文档的请求秒返回，后台慢慢学） | 切 RabbitMQ/RocketMQ 还要改 ct-rag 订阅，NATS 直接协议不变，0 成本 |
| 🟢 对象存储 SDK | **AWS SDK v2 for Java** | 上传/下载图片/附件到 MinIO/阿里云 OSS/腾讯云 COS | MinIO 专属 SDK 协议兼容性差，AWS SDK 是 S3 协议事实标准，所有存储都兼容 |
| 🟢 认证框架 | **Spring Security 6 + 自研 JWT Filter** | 每个请求的保安，检查你有没有通行证/权限 | Sa-Token 轻但不够灵活，Spring Security SPEL 注解写权限太方便了 |
| 🟢 参数校验 | **Jakarta Validation (Hibernate Validator)** | 接口参数自动校验（比如密码不能少于 6 位、邮箱格式对不对） | Spring Boot 原生，`@NotNull` `@Email` 加注解就行，不用自己写 if |
| 🟢 API 文档 | **SpringDoc OpenAPI 3** | 自动生成接口文档 JSON，前端自动生成 TS 类型 | 不用 Swagger2 了，SpringDoc 是 Spring Boot 3 官方推荐 |
| 🟢 JSON 序列化 | **Jackson（全局下划线）** | Java 对象 ↔ JSON 字符串互转 | Go 版 JSON 是 snake_case（`user_name`），Jackson 全局转下划线，前端字段 0 改动 |
| 🟢 对象转换 | **MapStruct（编译期）** | Entity ↔ DTO 拷贝字段，不用手写 set/get | ModelMapper 运行期反射慢，MapStruct 编译期生成代码，和手写一样快 |
| 🟢 数据库迁移 | **Flyway** | 版本化管理建表脚本，V1__建用户表、V2__加索引… | Liquibase 支持 XML 太复杂，Flyway 纯 SQL 和 Go 版 `cmd/migrate` 思路一模一样 |
| 🟢 限流 | **Resilience4j + Redis 计数** | 登录接口 5 次/30 分钟，防暴力破解密码 | Bucket4j/Redisson 也行，登录限流这个场景 Resilience4j 几行配置搞定 |
| 🟢 定时任务 | **Spring @Scheduled** | 固定时间跑的任务（小时统计/天统计） | XXL-Job 要额外部署管理端，现在单实例够用，以后多实例再换 |
| 🟢 Token 计数 | **jtokkit** | 精确算一次 AI 对话花了多少 Token，用来计费 | 不用手写字数估算，jtokkit 和 OpenAI 官方分词一致 |
| 🟢 可观测 | **Micrometer + Sentry Java SDK** | 生产报错/性能瓶颈监控，Dashboard 可视化 | Prometheus + Actuator 也行，Sentry 报错堆栈详情比自己看日志方便 100 倍 |

---

## 六、数据模型设计（每张表存啥？每个字段啥意思？）

> 🗄️ **核心原则**：Flyway V1 脚本直接从现有的 PostgreSQL 数据库用 `pg_dump --schema-only` 导出，保证和 Go 版表结构 100% 一模一样，数据不用动。

### 6.1 字段类型翻译对照表（PostgreSQL → Java，附白话）

| PostgreSQL 类型 | Java 类型 | 【白话】存什么内容的 | 常见例子 |
|---|---|---|---|
| `uuid`（主键） | `java.util.UUID` | 每行数据的唯一身份证号，不会重复 | `a1b2c3d4-...` |
| `varchar(n)` | `String` | 字符串，最多 n 个字符 | 用户名、标题、密码哈希 |
| `text` | `String` | 长文本，长度不限 | 文档正文、AI 回答内容 |
| `jsonb` | `Map<String, Object>` / 自定义类 | **可索引的 JSON**，存结构化但字段不固定的东西 | 文档 AI 状态、节点权限配置 |
| `text[]` | `String[]` / `List<String>` | 字符串数组，存一组字符串 | 对话里的图片路径列表 |
| `float8`（=double） | `double` | 双精度小数，精度很高 | **position 排序用**（1e-5 ~ 1e38） |
| `int / smallint` | `Integer / Short` | 整数 | 权限枚举编号 0/1/2/3 |
| `boolean` | `Boolean` | 是/否、开/关 | is_active 是否激活 |
| `timestamptz` | `Instant` / `LocalDateTime` | 带时区的时间戳 | 创建时间、最近访问时间 |

### 6.2 4 张核心表 DDL 示例（建表 SQL + 逐字段解释）

> 📝 **每张表下面都跟「业务话翻译」：这张表到底存的是什么东西？对应实际业务的哪件事？**

```sql
-- ======================================================
-- Flyway 脚本命名：V1__init_base_schema.sql
-- 意思是第 1 版脚本，初始化基础表
-- ======================================================

-- ======================================================
-- 表 1：users（后台用户表）
-- 【白话翻译】：存 PandaWiki 管理后台的登录账号（管理员/运营人员）
-- ======================================================
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- 主键ID，自动生成UUID
    account      VARCHAR(64)  NOT NULL UNIQUE,                 -- 登录账号（不能重复），比如 admin
    password     VARCHAR(255) NOT NULL,                       -- 登录密码（BCrypt加密，不是明文！）
    nickname     VARCHAR(128),                                 -- 显示昵称，比如「张管理员」
    role         VARCHAR(16)  NOT NULL DEFAULT 'user',        -- 全局角色：admin=超级管理员 / user=普通后台用户
    avatar       TEXT,                                          -- 头像图片URL
    last_access  TIMESTAMPTZ,                                   -- 最近一次访问系统的时间（用来判活跃用户）
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),          -- 账号创建时间
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()           -- 账号最后修改时间
);
CREATE INDEX idx_users_role ON users(role);  -- 按角色查的索引，加快查询


-- ======================================================
-- 表 2：kb_users（知识库-用户 多对多关系表）
-- 【白话翻译】：存「哪个用户 对 哪个知识库 有什么级别的权限」
-- 🌰 举例：用户张三 对 知识库「HR 手册」有权限=只读；对「产品研发文档」有权限=读写
-- ======================================================
CREATE TABLE kb_users (
    id       BIGSERIAL PRIMARY KEY,                             -- 自增主键，纯技术用
    kb_id    UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,  -- 关联：哪个知识库ID
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,            -- 关联：哪个用户ID
    perm     SMALLINT NOT NULL DEFAULT 1,                      -- 【重点翻译👇】权限级别：
                                                                --   0 = Null    无权限（看不到这个KB）
                                                                --   1 = ReadOnly 只读（只能看，不能改）
                                                                --   2 = ReadWrite 读写（能看+能新建/改文档）
                                                                --   3 = FullControl 完全控制（KB所有者，干啥都行）
    UNIQUE(kb_id, user_id)                                      -- 同一个人对同一个知识库只能有一条记录
);


-- ======================================================
-- 表 3：nodes（文档节点表 - 全系统最核心、最大的表）
-- 【白话翻译】：存所有的「文件夹」和「文档」，树形结构（文件夹里可以套子文件夹/文档）
-- 🌰 举例：知识库「产品手册」→ 文件夹「功能介绍」→ 文档「AI 问答功能」
-- ======================================================
CREATE TABLE nodes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- 主键：每个文档/文件夹的唯一ID
    kb_id        UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,  -- 属于哪个知识库
    nav_id       UUID,                                           -- 挂在导航菜单的哪个位置（可空）
    parent_id    UUID REFERENCES nodes(id) ON DELETE CASCADE,   -- 父节点ID（=上一级文件夹ID），顶级节点=空
    type         VARCHAR(16) NOT NULL,                          -- 类型：folder=文件夹 / document=文档
    title        VARCHAR(512) NOT NULL,                         -- 标题：文件夹名 / 文档名
    status       VARCHAR(16) NOT NULL DEFAULT 'draft',         -- 状态：draft=草稿（别人看不到）/ published=已发布
    content      TEXT,                                            -- 文档正文内容（Markdown 或 HTML 原文）
    position     DOUBLE PRECISION NOT NULL,                     -- 【排序用】同级节点的位置，double 间隙排序算法：
                                                                  -- 插在 A(1.0) 和 B(2.0) 之间，新节点=1.5
                                                                  -- 再插在 A(1.0) 和新(1.5) 之间=1.25
                                                                  -- 这样不用动其他节点的 position，无限插
    rag_info     JSONB NOT NULL DEFAULT '{}',                   -- 【AI向量化状态】JSON结构：
                                                                  -- { status: 'PENDING'待学习 / 'SUCCESS'学习好 / 'FAILED'失败,
                                                                  --   synced_at: '2026-08-05T10:00:00Z',
                                                                  --   message: '错误信息（如果失败）',
                                                                  --   dataset_id: 'ct-rag里的数据集ID' }
    permissions  JSONB NOT NULL DEFAULT                          -- 【单文档三开关权限，翻译👇】
                    '{"visible":0,"visitable":0,"answerable":0}',
                                                                  -- visible    可见性：   0=所有人可见  1=登录可见  2=完全不可见
                                                                  -- visitable  可访问：   0=所有人可点进去  1=登录才能点  2=谁都点不开
                                                                  -- answerable 可被AI引用：0=AI问答会引用它  1=只有登录用户的问题才会引用  2=AI永远不引用
    meta         JSONB NOT NULL DEFAULT '{}',                   -- 元信息：自定义字段，比如 {author_id, tags:[]}
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- 常用查询加索引（加快查找速度，不然表大了查一次要几秒）
CREATE INDEX idx_nodes_kb_parent ON nodes(kb_id, parent_id);
CREATE INDEX idx_nodes_position ON nodes(kb_id, position);
CREATE INDEX idx_nodes_rag_info_gin ON nodes USING GIN (rag_info jsonb_path_ops);


-- ======================================================
-- 表 4：models（AI 模型配置表）
-- 【白话翻译】：存系统里配置好的 AI 模型，用户在后台选模型的时候就是看这张表
-- 🌰 举例：配置了 OpenAI GPT-4o-mini 作为对话模型、text-embedding-3-small 作为向量模型
-- ======================================================
CREATE TABLE models (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider        VARCHAR(64)  NOT NULL,                      -- AI厂商：openai / azure / deepseek / baizhi / ollama ...
    model           VARCHAR(128) NOT NULL,                      -- 模型名：gpt-4o-mini / text-embedding-3-small ...
    type            VARCHAR(32)  NOT NULL,                      -- 【5种类型翻译👇】：
                                                                  -- chat      = 对话模型（聊天/创作/问答）
                                                                  -- embedding = 向量模型（文档转向量）
                                                                  -- rerank    = 重排模型（排序检索结果）
                                                                  -- vision    = 视觉模型（看懂图片）
                                                                  -- analyze   = 分析模型（数据分析/代码生成）
    api_key         VARCHAR(255) NOT NULL,                      -- 厂商给的 API Key，AES加密存（不能明文）
    base_url        VARCHAR(512),                                -- 厂商API地址，自己部署 Ollama 就填 http://localhost:11434
    parameters      JSONB NOT NULL DEFAULT '{}',                -- 高级参数：{temperature:0.7, top_p:1.0, max_tokens:4096}
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,             -- 是否是当前激活的默认模型（每种type只能有1个=true）
    token_counters  JSONB NOT NULL DEFAULT                        -- 累计Token消耗，计费用：
                    '{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, model, type)                                -- 同一个厂商+同一个模型+同一种类型，不能重复配
);
-- 【业务唯一约束】：每种 type 只能有 1 个激活模型（用 PostgreSQL 部分唯一索引实现）
CREATE UNIQUE INDEX idx_models_active_type ON models(type) WHERE is_active = TRUE;
```

### 6.3 JPA Entity 代码示例（Java 类 + 中文逐行解释）

```java
// ======================================================
// entity/base/BaseEntity.java （基类：所有表都继承它，ID/创建时间不用重复写）
// ======================================================
@MappedSuperclass   // 说明这是所有表的父类，不是一张独立的表
@Getter @Setter     // Lombok 自动生成 Get/Set 方法（不用手写，少写一堆代码）
public abstract class BaseEntity {

    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(columnDefinition = "uuid")
    private UUID id;                // 每张表的主键ID（UUID）

    @CreationTimestamp              // Hibernate 自动帮你填「插入时的时间」
    @Column(updatable = false)      // 一旦创建就不能改
    private Instant createdAt;      // 创建时间

    @UpdateTimestamp                // Hibernate 自动帮你填「每次修改时的时间」
    private Instant updatedAt;      // 更新时间
}


// ======================================================
// entity/User.java （用户表实体类，对应 users 表）
// ======================================================
@Entity
@Table(name = "users")   // 对应 PostgreSQL 里的表名 = users
@Getter @Setter
public class User extends BaseEntity {   // 继承 BaseEntity，所以自动有 id/createdAt/updatedAt

    @Column(unique = true, nullable = false, length = 64)
    private String account;          // 登录账号（唯一、不能为空、最多64字符）

    @Column(nullable = false)
    private String password;         // 密码（BCrypt 加密后的哈希值，绝对不能存明文）

    private String nickname;         // 昵称
    private String avatar;           // 头像URL

    @Enumerated(EnumType.STRING)     // 存到数据库里存的是字符串 "ADMIN"/"USER"，不是数字
    @Column(nullable = false, length = 16)
    private UserRole role = UserRole.USER;   // 默认新用户是普通后台用户

    private Instant lastAccess;      // 最近访问系统时间

    // 两个全局角色的枚举（翻译成中文）：
    public enum UserRole {
        ADMIN,   // 超级管理员：能干任何事（配AI模型、看所有知识库）
        USER     // 普通后台用户：只能看自己有权限的知识库
    }
}


// ======================================================
// entity/Node.java （文档节点实体类，对应 nodes 表 - 系统核心）
// ======================================================
@Entity
@Table(name = "nodes", indexes = {   // 给这张表建索引，加速常用查询
    @Index(name = "idx_nodes_kb_parent", columnList = "kb_id, parent_id"),
    @Index(name = "idx_nodes_position", columnList = "kb_id, position")
})
@Getter @Setter
public class Node extends BaseEntity {

    @Column(nullable = false)
    private UUID kbId;             // 属于哪个知识库（知识库ID）

    private UUID navId;            // 挂在哪个导航菜单下（可空）
    private UUID parentId;         // 父节点ID（=在哪个文件夹里面，空=顶级节点）

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private NodeType type;         // FOLDER=文件夹 / DOCUMENT=文档

    @Column(nullable = false, length = 512)
    private String title;          // 标题（文档名 / 文件夹名）

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private NodeStatus status = NodeStatus.DRAFT;  // 默认新建是草稿

    @Column(columnDefinition = "text")
    private String content;        // 文档正文（可以是 Markdown 或 HTML 原文）

    @Column(nullable = false)
    private Double position;       // 【排序字段】double 间隙算法，1e-5（最小间隙）~ 1e38（最大值）

    // rag_info JSONB：AI 向量化状态
    @JdbcTypeCode(SQLTypes.JSON)   // 告诉 Hibernate：这字段存到 PG 里是 JSONB 类型
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> ragInfo = new HashMap<>();

    // permissions JSONB：三开关权限 {visible, visitable, answerable}
    @JdbcTypeCode(SQLTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Integer> permissions = Map.of(
        "visible",    0,   // 可见性：0=所有人  1=登录  2=不可见
        "visitable",  0,   // 可访问：0=所有人  1=登录  2=点不开
        "answerable", 0    // 可AI引用：0=所有问题  1=登录用户问题  2=永不引用
    );

    @JdbcTypeCode(SQLTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> meta = new HashMap<>();  // 自定义扩展字段

    public enum NodeType   { FOLDER /* 文件夹 */, DOCUMENT /* 文档 */ }
    public enum NodeStatus { DRAFT  /* 草稿  */, PUBLISHED /* 已发布 */ }
}
```

---

## 七、权限模型（4 维 · 全中文 + 真实业务举例）

> 🎪 **一句话理解：权限控制 = 「你是谁」→「你能看哪个知识库」→「你能看知识库里面哪篇文档」→「你能用商业版功能吗」**
>
> 🌰 **用一家公司的真实场景套进去讲**：
> 公司 = ABC科技；员工 = 小明（产品部）、小红（客服部）、老王（老板）；
> 知识库 1 = 「产品研发文档」；知识库 2 = 「客服话术手册」；知识库 3 = 「全员制度手册」

### 维度 1️⃣：全局角色（UserRole）——你在后台的「身份等级」

| 枚举值 | 中文翻译 | 🌰 公司里对应谁 | 能干嘛 |
|---|---|---|---|
| `admin` | **超级管理员** | 老王（老板）/ CTO | 管整个系统：配 AI 模型、新建/删除知识库、看所有统计 |
| `user` | **普通后台用户** | 小明（产品）/小红（客服） | 只能看自己「被分配了权限」的知识库，其他的连影子都看不到 |


### 维度 2️⃣：知识库权限（UserKBPermission）——你对「某一个知识库」能干嘛？

> 📌 **这是用户重点问的！翻译如下：**

| 编号 | 枚举值（Go 里存的数字） | 中文翻译 | 🌰 业务举例（用户=小明·产品经理） | 具体能做的事（✔能 ✘不能） |
|---|---|---|---|---|
| 0 | `Null` | **❌ 无权限** | 小明 对 「客服话术手册」 | ✘ 后台列表里看不到这个知识库<br>✘ 前台 URL 直接访问也=404 |
| 1 | `ReadOnly` | **👀 只读权限** | 小红（客服） 对「产品研发文档」，她只是了解下不用改 | ✔ 浏览所有文件夹/已发布文档<br>✔ AI 问答搜这个知识库的内容<br>✘ 新建/编辑/删除任何文档<br>✘ 改知识库设置、加成员 |
| 2 | `ReadWrite` | **✏️ 读写权限** | 小明（产品） 对「产品研发文档」 | ✔ 👀 所有只读能力<br>✔ 新建文件夹/文档<br>✔ 编辑/移动/删除 自己和别人创建的文档<br>✔ 发布/取消发布<br>✘ 改知识库基础设置（名称/域名/证书）<br>✘ 加/踢知识库成员<br>✘ 改 RAG 数据集绑定 |
| 3 | `FullControl` | **👑 完全控制（知识库所有者）** | 小明 对「产品研发文档」是创建者，所以他是所有者 | ✔ ✏️ 所有读写能力<br>✔ 改知识库名字/绑定域名/传 SSL 证书<br>✔ 加人/踢人、修改某个人的权限等级<br>✔ 删除整个知识库<br>✔ 绑定/解绑 ct-rag 数据集<br>✔ 【啥都能干，相当于 KB 的 admin】 |

---

### 维度 3️⃣：节点权限（NodePermissions）——你对「某一篇具体文档/文件夹」能干嘛？

> 🎚️ 这是 **3 个独立的三态开关**，存在 nodes 表的 `permissions JSONB` 字段里，每个文档单独设置。
>
> 三态值：`0=All 所有人 / 1=Login 仅登录用户 / 2=None 完全禁止`

| 开关英文名 | 中文翻译 | 说明（🌰 举个场景） |
|---|---|---|
| `visible` | **🔍 导航可见性** | 这篇文档在 Wiki 前台的左侧导航树里「看不看得见」<br>🌰 草稿文档先设 visible=2，别人在导航里看不到，URL 直达还能访问 |
| `visitable` | **🚪 直接可访问性** | 别人直接点文档 URL 链接，能不能进到阅读页<br>🌰 内部机密文档设 visitable=1，只有登录员工能看，外部客户不行 |
| `answerable` | **🤖 AI 可引用性** | AI 在回答用户问题的时候，能不能引用这篇文档的内容当答案<br>🌰 薪资制度文档设 answerable=2，员工问「工资多少」AI 永远不会搜到这篇 |

---

### 维度 4️⃣：License 版本（商业版功能拦截）

| 版本 | 中文翻译 | 功能差异 |
|---|---|---|
| `Community` | **社区版（开源免费）** | 基础功能：Wiki + AI 问答 + 基础权限；不含多租户、企业微信机器人、高级审计 |
| `Pro` | **专业版（付费）** | 社区版全部 + 多租户隔离 + 高级权限（部门/角色组）+ 企业 IM 机器人 |
| `Enterprise` | **企业版（定制付费）** | Pro 全部 + 私有化部署 + 专属技术支持 + 定制开发 + SLA 保障 |

> ⚠️ **当前重构策略（D14 决策）**：Community 功能先全部做出来，Pro/ENT 的功能点先留接口占位，不写死逻辑，后续加代码就行。

---

## 八、安全与认证方案（JWT / Token / Filter 全中文解释）

### 8.1 双 Token 体系（和 Go 版 100% 一致，前端不改）

> 🎫 **用生活里的两种证件打比方，一下就懂：**

| Token 类型 | 识别方式【核心：看 Bearer 后面的字符串含不含「.」点号】 | 存在哪 | 校验路径（保安怎么查） | 白话证件类比 |
|---|---|---|---|---|
| **JWT 通行证** | `Authorization: Bearer xxx.yyy.zzz`（**里面有 2 个点**，三段式） | 前端浏览器 `localStorage.panda_wiki_token` | 本地算签名，**不查 Redis 不查数据库**，毫秒级通过 | **盖了防伪钢印的工作证**：照片+职位+有效期，保安看一眼钢印是真的就放行，不用打电话去人事查 |
| **API Token 门禁卡** | `Authorization: Bearer abcdef123456`（**里面一个点都没有**，一串乱码） | DB `api_tokens` 表 + Redis 缓存（最近用过的，加快查询） | 先查 Redis 有没有，没有查 DB → 取出 userId/kbId/权限 | **小区门禁卡**：保安要刷一下门禁系统（查数据库）才知道你是这个小区的，能进哪栋楼 |

---

### 8.2 JWT 结构（Claims 载荷里面装了什么信息？）

```
┌─────────────────────────────────────────────────────┐
│  JWT 通行证长这样：eyJhbGciOiJIUzI1NiJ9.eyJpZCI6...   │
│  用「.」分成 3 段，Base64 解码后分别是：               │
├─────────────────────────────────────────────────────┤
│  第 1 段 Header：{                                    │
│    "alg": "HS256",      ← 签名算法=SHA256 哈希        │
│    "typ": "JWT"          ← 类型是 JWT                │
│  }                                                    │
├─────────────────────────────────────────────────────┤
│  第 2 段 Payload（【核心】装的用户信息=Claims）：       │
│  {                                                     │
│    "sub":  "a1b2...",    ← 标准字段：用户UUID          │
│    "id":   "a1b2...",    ← ← ← 【重点兼容 Go 版】Go里用 claims["id"] 取，所以 Java 也放这个字段，不能改名字
│    "role": "admin",     ← 全局角色：admin / user
│    "iat":  1722800000,  ← 签发时间戳（秒）
│    "exp":  1722886400,  ← 过期时间戳（默认签发后 24 小时）
│    "iss":  "pandawiki"   ← 签发人
│  }
├─────────────────────────────────────────────────────┤
│  第 3 段 Signature：                                   │
│    HS256(base64(第1段) + "." + base64(第2段), 密钥)    │
│    【防篡改】：任何人改了第2段的 role=user→admin，第3段签名就对不上，直接 401
└─────────────────────────────────────────────────────┘
```     

**JWT 常见 4 种失败情况 → 统一返回 401 未登录**：
| 失败原因 | 前端处理 |
|---|---|
| `签名错误`（密钥不对/被篡改） | 清 localStorage.panda_wiki_token → 跳 `/login` 重登 |
| `已过期`（exp < 当前时间） | 同上 |
| `格式非法`（少于 2 个点 / 解不出 JSON） | 同上 |
| `请求头里根本没 Authorization`（没登录） | 同上 |

---

### 8.3 Spring Security 拦截链（Filter = 公司门口的保安）

> 🚧 **一个请求进后端的完整流程（按顺序过 5 关）**：
> ```
> 浏览器发请求 → Security 保安队按顺序查证件：
>   ① CorsFilter（跨域保安）→ 查请求源是不是白名单域名
>   ② JwtAuthFilter（证件查验员）→ 重点！看下面 8.4 详解
>   ③ FilterSecurityInterceptor（权限决策员）→ 看 URL 需要啥角色/权限，你够不够
>   ↓ 过了所有关 → Controller 接口方法真正执行业务逻辑
>   ↓ 哪一关没过 → 直接 401/403 响应，根本碰不到 Controller
> ```

```java
// ======================================================
// config/SecurityConfig.java （保安队配置文件：哪条路派哪些保安）
// ======================================================
@Bean
public SecurityFilterChain v1FilterChain(HttpSecurity http, JwtAuthFilter jwtFilter) throws Exception {
    return http
      // 【第 0 关】这个 Filter 链只管 /api/v1/** 和 /openapi/v1/** 的请求
      .securityMatcher("/api/v1/**", "/openapi/v1/**")

      .csrf(AbstractHttpConfigurer::disable)          // 前后端分离项目关 CSRF（没用，还碍事）
      .cors(c -> c.configurationSource(corsConfigSource()))  // 【第 1 关】跨域白名单
      // 后台接口是无状态的，不用 Session（登录靠 JWT）
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

      // 【第 2 关】把我们自定义的 JWT 查证件保安，插到默认保安 UsernamePasswordAuthenticationFilter 前面
      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

      // 【第 3 关】URL 级权限规则
      .authorizeHttpRequests(auth -> auth
        // 🟢 白名单接口（不用登录就能访问）
        .requestMatchers(
            "/api/v1/user/login",     // 登录接口（不然你怎么拿通行证？）
            "/api/v1/captcha/*",      // 登录验证码图片
            "/swagger/*"              // 本地开发 Swagger 文档
        ).permitAll()
        // 🔴 管理员专属接口（必须 role=ADMIN）
        .requestMatchers("/api/v1/model/**", "/api/v1/stat/global").hasRole("ADMIN")
        // 🟡 其他所有接口：必须先登录，细粒度 KB 权限在 Controller/Service 用 SPEL 注解判断
        .anyRequest().authenticated()
      )

      // 【失败处理】：证件无效/权限不够时，返回统一 PWResponse 格式（不是 Spring 默认的 HTML 错误页）
      .exceptionHandling(ex -> ex
        .authenticationEntryPoint(new Jwt401Handler())   // 401 未登录 → 前端认的 JSON 格式
        .accessDeniedHandler(new Jwt403Handler())        // 403 权限不够 → 同上
      )
      .build();
}
```

---

### 8.4 JwtAuthFilter 核心逻辑（证件查验员 = 按有没有点判断是哪种证件）

```java
// ======================================================
// common/security/JwtAuthFilter.java （继承 OncePerRequestFilter = 每个请求只查一次）
// ======================================================
@Override
protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {

    // 步骤 1：从请求头里把 Authorization 取出来
    String header = req.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
        // ⚪ 情况 A：没带 Authorization 头 → 不是登录请求，直接放行（后面的权限关会拦）
        chain.doFilter(req, res);
        return;
    }
    String token = header.substring(7);  // 去掉 "Bearer " 前缀，拿到真正的 token 字符串

    Authentication auth;  // 等会儿查完证件，把「你是谁+有啥权限」封装到这个对象里

    if (token.contains(".")) {
        // ================================================================
        // 🟢 情况 B：token 里有点 → 【JWT 通行证】（本地验签，不查 DB/Redis）
        // ================================================================
        Claims claims = JwtUtil.parse(token);   // ① 验签名 + ② 查过期时间，不对直接抛异常

        UUID   userId = UUID.fromString(claims.get("id", String.class)); // 从 claims 里拿用户ID
        String role   = claims.get("role", String.class);                 // 拿全局角色

        // 异步记录用户最近访问时间（丢到线程池里跑，不阻塞请求，不然每次登录都写 DB 慢）
        asyncUserAccessRecorder.record(userId);

        // 把「你是谁」塞进 Spring 的 SecurityContext，后面的权限注解都能拿
        auth = new UsernamePasswordAuthenticationToken(
            new AuthPrincipal(userId, role, false /* false=JWT登录 */),
            null,  // JWT 不需要密码
            AuthorityUtils.createAuthorityList("ROLE_" + role.toUpperCase())  // ROLE_ADMIN / ROLE_USER
        );
    } else {
        // ================================================================
        // 🔵 情况 C：token 里没点 → 【API Token 门禁卡】（必须查 DB）
        // ================================================================
        APIToken tokenObj = apiTokenRepo.findByToken(token)  // 先查 Redis 缓存，没命中再查 PostgreSQL
                .orElseThrow(() -> new AuthException(ErrorCode.API_TOKEN_INVALID)); // 找不到就是假卡 401

        // 从数据库记录里拿：userId + 限定的 kbId + 限定的 perm
        auth = new UsernamePasswordAuthenticationToken(
            new AuthPrincipal(
                tokenObj.getUserId(),
                tokenObj.getKbId(),          // 可能=空，也可能固定只能访问一个 KB
                tokenObj.getPermission(),     // 门禁卡的权限等级（可能比实际账号权限低）
                true /* true=API Token 登录 */
            ),
            null,
            AuthorityUtils.createAuthorityList("ROLE_USER")  // API 统一算普通用户
        );
    }

    // ✅ 查到合法身份了 → 塞给 Spring Security 上下文
    SecurityContextHolder.getContext().setAuthentication(auth);
    chain.doFilter(req, res);  // 放行，去下一关
}
```

---

### 8.5 前台 Wiki 共享鉴权链（/share/v1/** — 给外部访客用的）

> 🏪 **管理后台接口**是给内部员工（有账号密码）登录用的；
> **前台共享接口 /share/v1/** 是给外部客户/匿名访客访问公开 Wiki 用的，流程不一样：

```
访客浏览器打开 https://wiki.abc.com  →  请求 /share/v1/nav/tree?X-KB-ID=xxx
                                                         ↑
                                    【必须带的请求头 X-KB-ID：访问哪个知识库】
                                                    ↓
                                  ShareAuthFilter 保安按 5 步走：
                                    ① 查 kb_id 对的知识库在不在 → 不在=404
                                    ② 查 knowledge_bases.access_settings.IsForbidden=true?
                                       → 是=403（管理员把这个知识库临时封了）
                                    ③ 看这个知识库开了什么认证：
                                       ├─ 简单认证关 + 企业认证关 都关着
                                       │    → 匿名游客，放行（存匿名 AuthPrincipal）
                                       ├─ 简单密码认证开着
                                       │    → Cookie Session 里有没有之前存的 kb_id?
                                       │       有→放行；没有→弹窗让输入密码，对了存 Session
                                       └─ 企业认证（LDAP/钉钉/飞书/OAuth）开着
                                            → Session 里有没有 user_id+kb_id?
                                               有→放行；没有→跳 SSO 登录页，回来写 Session
```

---

### 8.6 SPEL 注解式 4 维权限（Controller/Service 上写一行注解就搞定）

> 🎯 **这是 Spring Security 的杀手级功能：写接口的时候在方法上面加一行 `@PreAuthorize(...)`，没有权限这个方法根本不会执行，自动返回 403。**

```java
// ======================================================
// common/security/PermissionService.java
// 【重要！】这个 Bean 在 Spring 容器里的名字叫 "pms"（= permissions）
// ======================================================
@Component("pms")   // ← 名字！SPEL 里用 @pms 引用它
public class PermissionService {

    // 维度 2：知识库权限校验
    // 入参：kbId=哪个知识库，perm=要求达到的最低等级（"ReadOnly"/"ReadWrite"/"FullControl"）
    public boolean hasKbPerm(UUID kbId, String perm) {
        // 1. 从 SecurityContext 拿当前登录 userId
        UUID currentUserId = AuthContext.getUserId();
        // 2. 查 kb_users 表，这个用户对这个 kb 存的 perm 数字是多少
        Integer userPerm = kbUserRepo.findPerm(kbId, currentUserId).orElse(0);
        // 3. 比较：用户等级 >= 要求等级 就过；否则 403
        return permLevel(userPerm) >= permLevel(perm);
    }

    // 维度 3：节点权限校验（单文档三开关）
    public boolean hasNodePerm(UUID nodeId, String action /* visible/visitable/answerable */) {
        NodePermissions p = nodeRepo.findById(nodeId).orElseThrow().getPermissions();
        int level = p.get(action);
        if (level == 2) return false;                // 2=None 全禁止
        if (level == 1) return AuthContext.isLogin(); // 1=Login 只有登录用户能
        return true;                                  // 0=All 所有人
    }

    // 维度 4：License 版本拦截
    public boolean hasLicense(String edition /* Community/Pro/Enterprise */) {
        License current = licenseRepo.getCurrent().orElse(License.COMMUNITY);
        return current.level() >= levelOf(edition);
    }

    // ===== 内部工具方法：等级字符串 → 数字 =====
    private int permLevel(String s) {
        return switch(s) {
            case "FullControl" -> 3;
            case "ReadWrite"   -> 2;
            case "ReadOnly"    -> 1;
            default /* Null */ -> 0;
        };
    }
    private int permLevel(Integer i) { return i == null ? 0 : i; }
}


// ======================================================
// 【使用示例】 controller/v1/KnowledgeBaseController.java
// ======================================================
@RestController
@RequestMapping("/api/v1")
public class KnowledgeBaseController {

    // 【例 1】修改知识库设置：必须是这个 KB 的 FullControl 所有者
    @PutMapping("/knowledge-base/{kbId}")
    @PreAuthorize("@pms.hasKbPerm(#kbId, 'FullControl')")
    //                                 ↑      ↑ ↑
    //                        引用 Bean pms   方法参数 kbId 直接传进去
    public PWResponse<KBResp> update(@PathVariable UUID kbId,
                                     @RequestBody @Valid KBUpdateReq req) {
        return PWResponse.ok(kbService.update(kbId, req));
    }

    // 【例 2】删除一篇文档：必须对 KB 有 ReadWrite 权限 + 这篇文档没被锁
    @DeleteMapping("/node/{nodeId}")
    @PreAuthorize("@nodeService.canDelete(#nodeId) and @pms.hasKbPerm(@nodeService.getKbId(#nodeId), 'ReadWrite')")
    //                        ↑ 自定义方法支持任意组合，and / or 随便拼
    public PWResponse<Void> deleteNode(@PathVariable UUID nodeId) {
        nodeService.delete(nodeId);
        return PWResponse.ok();
    }

    // 【例 3】给模型配置开关：必须是全局 admin（维度 1）+ 商业版 License（维度 4）
    @PostMapping("/model/{id}/activate")
    @PreAuthorize("hasRole('ADMIN') and @pms.hasLicense('Pro')")
    public PWResponse<ModelResp> activateModel(@PathVariable UUID id) {
        return PWResponse.ok(modelService.activate(id));
    }
}
```

---

## 九、18 个业务模块全中文速览（每个模块：干啥的 + 核心表 + 进度）

| 编号 | 模块英文名 | 中文翻译 | 【白话】它管啥的🌰 | 核心数据表 | 当前进度 |
|---|---|---|---|---|---|
| M01 | 用户与权限 | User & Permission | 管后台账号：新建员工账号、重置密码、改 admin/user 身份 | `users`（后台账号表）、`kb_users`（用户-KB 权限关系表） | ✅ 已完成 |
| M02 | 认证体系 | Authentication & SSO | 管登录登出：JWT 登录、API Token 生成、LDAP/钉钉/飞书企业 SSO、GitHub OAuth | `auths`（前台访客登录记录）、`auth_configs`（SSO 配置）、`auth_groups`（企业部门树）、`api_tokens`（门禁卡） | ✅ 已完成 |
| M03 | 知识库管理 | Knowledge Base | 管知识库本身：新建 KB、绑域名/SSL 证书、设访问密码、分配成员权限、绑定 ct-rag 数据集 | `knowledge_bases`（知识库主表） | ✅ 已完成 |
| M04 | 文档节点 Node | Document & Folder Tree | 管每个 KB 里的内容：新建文件夹/文档、移动位置、发布/草稿、**double 间隙排序**、内容编辑 | `nodes`（全系统最大表！）、`node_stats`（单文档阅读量点赞数） | ✅ 已完成 |
| M05 | 导航 NavTree | Navigation Menu Tree | 管左侧导航菜单：新建导航分组、把文档拖到导航里、自定义导航排序 | `navs`（导航项表）、`node_groups`（导航分组表） | ✅ 已完成 |
| M06 | AI 模型配置 | AI Model Config | 管后台配置 AI 模型：新增 OpenAI/DeepSeek 配置、测试连接、切换默认激活模型、Token 累计消耗统计 | `models`（AI 模型配置表）、`prompts`（系统提示词模板表） | 📌 **阶段 3·下一个** |
| M07 | AI 对话 | AI Conversation（SSE 流式） | 管 AI 聊天：新建对话、SSE 流式打字机输出、引用 Wiki 文档溯源、对话历史记录、用户点赞点踩反馈 | `conversations`（对话会话表）、`conversation_messages`（消息树表）、`conversation_references`（引用文档溯源表） | 📌 **阶段 3·下一个** |
| M08 | AI 创作 | AI One-Click Creation | 管单轮 AI 创作：选中一段文字 → AI 续写 / 润色 / 翻译 / 摘要 / 改写 / 自由提问 | （没有独立表，共用 M06/M07 的模型和消息计数） | 📌 **阶段 3·下一个** |
| M09 | 数据抓取导入 | Crawler & Importer | 管一键导入外部文档到 Wiki：导入 URL 单页、Sitemap 整站、RSS 订阅、EPUB/Markdown 离线文件、**第三方平台对接**（语雀/飞书文档/Notion/Confluence/思源/Mindoc） | （导入成功后的数据都落 `nodes` 文档表） | 🟡 阶段 4 |
| M10 | 应用与集成 | Apps & Integrations | 管对外集成：Wiki 挂件（嵌入别的网站）、**IM 聊天机器人**（钉钉/飞书/企业微信/微信公众号/Discord 接入）、MCP 服务、OpenAPI 对外暴露 | `apps`（应用配置表）、`mcps`（MCP Server 配置表） | 🟡 阶段 5 |
| M11 | 文件上传导出 | File Upload & Export | 管文件：上传图片/附件到 MinIO S3、导出文档为 Word/PDF/Markdown、静态文件代理访问 | （文件存 S3，系统配置存 system_settings） | 🟡 阶段 4 |
| M12 | 统计与遥测 | Statistics & Telemetry | 管统计报表：PV/UV 访问量、地域分析（IP 查城市）、知识库热度榜、文档阅读量排行、Token 消耗账单、AI 问答满意度 | `stats`（PV/UV 明细表）、`stat_hours`（小时聚合表）、`user_access`（最近访问明细） | 🟡 阶段 6 |
| M13 | 评论与反馈 | Comment & Feedback | 管读者互动：文档下面的评论（CRUD）、前台用户反馈表单（收集建议/Bug） | `comments`（文档评论表）、`user_feedbacks`（用户反馈表） | 🟡 阶段 6 |
| M14 | 共享站点前台 | Wiki Share Site | 管外部访客看 Wiki：`/share/v1/*` 共享访问鉴权、Sitemap 生成（给百度/Google 搜）、SEO 优化、访客验证码 | （复用上面所有业务表，只加一层 Filter 鉴权） | 🟡 阶段 6 |
| M15 | 系统设置 | System Settings | 管全局配置：全局屏蔽词（输入内容自动过滤）、AI 默认系统提示词、全局安全策略（密码强度/登录时长） | `system_settings`（全局 KV 配置表）、`block_words`（全局屏蔽词表） | 🟡 阶段 4 |
| M16 | RAG 向量学习（异步） | Async RAG Learning | 管「文档 → AI 能搜到」的后台流程：文档保存后发 NATS 消息 → Consumer 调 ct-rag `/dataset/*` 接口分块+入库+回写 rag_info 状态 | （主要更新 `nodes.rag_info` JSONB 字段 + ct-rag 侧数据集） | 🟡 阶段 5 |
| M17 | 定时任务 Cron | Scheduled Cron Jobs | 管固定时间自动跑的事：①每小时 PV/UV 聚合；②每天扫失败的文档重新向量化；③每月检查 License 过期 | （输出主要写 `stat_hours` 聚合表） | 🟡 阶段 5 |
| M18 | 数据库迁移工具 | DB Migrate Tool | 管版本化 schema 演进：Flyway V1→V2→V3…脚本、老数据修复脚本、上线前一键迁移 | `schema_migrations`（Flyway 自动维护的脚本记录表） | 🟡 阶段 6 |

---

## 十、关键数据流（2 条核心流程 · 中文步骤）

### 10.1 流程 1：新建文档 → AI 向量学习（异步 · 不让用户等）

> 🚀 **一句话讲**：用户点保存 → 文档秒成功提示 → 后台慢慢让 AI 学这篇文档 → 学完了打个勾
>
> 为什么要异步？因为 ct-rag 分块+Embedding 一篇 1 万字文档可能要 10~30 秒，同步等的话用户以为系统卡了会狂点刷新！

```
🌰 场景：小明在产品研发 KB 新建了一篇文档「退款流程.docx」点了发布
                                                                
   ① 前端：POST /api/v1/node { kb_id, parent_id, title="退款流程", content="1.xxx 2.xxx...", status=PUBLISHED }
          ↓
   ② NodeService.createNode()【Java 后端业务层】：
       ├─ 2.1 先写 nodes 表：position 算好、rag_info.status 写 "PENDING"（待学习排队中）
       └─ 2.2 类型是 DOCUMENT + 已发布？
           → 是 → 发一条 NATS 消息：Subject=doc.update, Payload={kb_id, node_id, content}
           → 否 → 不发（草稿/文件夹不用学）
          ↓
   ③ Controller 立刻返回：{ success:true, data:{id, rag_info:{status:"PENDING"}} } ✅
      用户看到「保存成功，正在让 AI 学习…」提示，继续干活去了，不用等
   （========== 上面是同步 HTTP 请求链路，200ms 返回；下面是后台异步 ==========）
   ④ NATS Consumer 监听 doc.update 队列（Spring NATS @NatsListener）：
       ├─ 4.1 调 ct-rag HTTP 接口：PUT /dataset/{datasetId}/document/{nodeId}  body=content
       │        ct-rag 内部：自动分块 → Embedding → 向量库入库 → 建索引
       ├─ 4.2 ct-rag 返回成功？
       │     ├ 是 ✅ → 写 nodes.rag_info = {status:"SUCCESS", synced_at:now(), dataset_id:xxx}
       │     └ 否 ❌ → 写 nodes.rag_info = {status:"FAILED", message:"错误原因..."}
       └─ 4.3 （可选）SSE 推送给当前在线的管理员「文档 123 学习完成」实时提示
```

---

### 10.2 流程 2：AI 问答对话（SSE 流式 · 打字机效果）

> 🚀 **一句话讲**：用户问一个问题 → 后端先去 ct-rag 搜知识库找相关文档 → 把【问题+找到的文档+系统提示词】一起发给 AI 模型 → 模型每生成一个 token 就推给前端一个 SSE 事件 → 前端渲染成「打字机蹦字」

```
🌰 场景：客服小红在客服话术 KB 的 AI 对话里问「客户买了套餐 A 能退款吗？退多少？」

   ① 前端：POST /share/v1/chat/stream  Header: X-KB-ID=客服话术KB
          Body: { conversation_id（新会话=空）, question:"客户买了套餐 A 能退款吗？退多少？", stream:true }
          ↓
   ② ChatService.streamChat()【Java 后端业务层】：
       ├─ 2.1 鉴权过了（ShareAuthFilter）→ 拿到 kbId + 当前访客身份
       ├─ 2.2 查 KB 绑定的模型：active 的 chat 模型？embedding 模型？rerank 模型？
       ├─ 2.3 调 ct-rag HTTP 接口 POST /retrieve {kb.dataset_id, question, top_k=5}
       │        ct-rag 返回：最相关的 5 个文档片段（node_id + 原文片段 + 相似度分数）
       ├─ 2.4 拼 Prompt（给 AI 看的完整输入，大概长这样）：
       │     """
       │     系统角色：你是 ABC 科技的官方客服，只能用下面提供的「参考文档」回答问题，
       │             参考文档里没有的内容就说「抱歉暂时没有相关资料，请联系人工客服」。
       │     参考文档 1：<引用 nodes.title=退款政策> 7 天无理由全额退款...
       │     参考文档 2：<引用 nodes.title=套餐介绍> 套餐 A: 7天内可退...       
       │     用户问题：客户买了套餐 A 能退款吗？退多少？
       │     """
       ├─ 2.5 调 ModelProvider.chatStream()【自研 AI 适配层】：
       │        → 选中的厂商（比如 DeepSeek）→ HTTP POST 流式请求 → 拿到一个 Flux<Token>
       │        → 每拿到一个 token（"可以"/"的"/"，"/"套餐"/"A"...）：
       │            a. 写 SSE 事件给前端：data: {"type":"token","content":"可以"}
       │            b. 同时拼到「完整回答」字符串里存起来
       ├─ 2.6 模型返回结束（收到 [DONE]）：
       │     a. 写 SSE 事件：done: {conversation_id, message_id, total_tokens:xx} ✅
       │     b. 写 conversation_messages 表：存完整回答 + prompt_tokens/completion_tokens/total_tokens
       │     c. 写 conversation_references 表：把 2.3 里找到的 5 个引用文档都记下来（前台点「来源」能跳转）
       │     d. 更新 models.token_counters：这个模型的累计消耗加上本次的 tokens
       ↓
   ③ 前端 eventSource 收到一连串 data: 事件 → 逐字追加到对话框 → 呈现「AI 正在打字…」效果
      最后收到 done: 事件 → 显示引用来源卡片 + Token 用量
```

---

## 十一、API 路由边界（4 组前缀 · 中文解释）

| 路由前缀 | 给谁用？ | 怎么证明身份？（鉴权方式） | 对应后端 Handler/Controller 目录 |
|---|---|---|---|
| **`/api/v1/*`** | 🏢 管理后台 web/admin（内部员工用的 React 网页，比如配置 AI 模型、新建 KB） | JWT Bearer Token（localStorage 存）**或** API Token（按「含不含点」自动识别） | `controller/v1/` |
| **`/share/v1/*`** | 🌐 Wiki 前台 web/app（外部访客看公开 Wiki 的 Next.js 网页，比如客户打开 help.abc.com） | Header 必须带 `X-KB-ID: <kb_uuid>` + Cookie `_pw_auth_session`（Redis 里存的会话） | `controller/share/` |
| **`/openapi/v1/*`** | 🤝 第三方系统对接（比如你们的 ERP 要自动调 PandaWiki 创建文档） | API Token（**Bearer 后面的字符串不能有点**），可配置 API Token 只能访问某个 KB + 某个权限等级 | `controller/openapi/` |
| **`/static-file/*`** | 🖼️ 双端共用（管理后台上传的产品截图、前台 Wiki 的文档附件） | 无需鉴权（公开文件），后端直接代理到 MinIO S3 流式返回，不占 Java 进程内存 | `controller/share/CommonController#staticFile()` |

**📦 统一响应体格式 PWResponse（前端只认这个！）**：
```json
{
  "success": true,          // true=成功前端取data；false=失败前端弹message
  "message": "操作成功",     // 错误提示文字（success=false 时必有）
  "data": { ... },          // 业务数据（对象/数组/字符串/空）
  "code": 0,                // 业务错误码（0=成功，其他=各模块自定义）
  "errCode": "AUTH_TOKEN_INVALID"  // 标准化错误字符串（前端国际化用）
}
```
HTTP 状态码约定：401=未登录前端清 token 跳登录；403=权限不足弹提示；400=参数校验错误；503=系统只读模式维护中。

---

## 十二、10 大风险与应对（全部已选 A 方案）

| 编号 | 风险是啥（人话） | 已经决定的应对方案 |
|---|---|---|
| R01 | 前端一个字段都不想改，但 Java 默认返回驼峰 `userName`，Go 版是下划线 `user_name` | **Jackson 全局 SNAKE_CASE 命名策略**：Entity/DTO 写驼峰就行，序列化自动转下划线，前端 0 改动 |
| R02 | ct-rag 现在只订阅 NATS `doc.update` 主题，换 MQ 的话 ct-rag 也要改，成本爆炸 | **继续用 NATS（Spring NATS 客户端）**：主题名/Payload 格式一丝不动，协议 0 切换，ct-rag 不用碰 |
| R03 | Go 版的 ModelKit v2 是闭源的，Java 根本没有，接 50 家厂商怎么办？ | **自实现 ModelProvider 接口层**：先接 5 家 OpenAI 兼容协议厂商（OpenAI/Azure/DeepSeek/百智云/Ollama），覆盖 90% 场景；其他厂商后续按需补 |
| R04 | nodes.position 排序用的是 Go 的 double 间隙算法（1e-5~1e38），PG 里已经存了几十万条，改排序法数据要全量迁移 | **Java 端 100% 复刻同算法**：`MinPositionGap=1e-5 / MaxPosition=1e38`，reBalance 重排逻辑一行行对照 Go 代码翻译，**现有 PG 数据 0 改动** |
| R05 | Redis 缓存里存的东西、PG JSONB 列里的字段名都是 Go 版 snake_case 命名的，Java 反序列化会错 | **Jackson Mixin + 字段 1:1 对齐**：Entity/DTO 字段名和 Go struct JSON tag 完全一样，加 `@JsonProperty("snake_name")` 兜底 |
| R06 | PG 里已经有真实业务数据了，JPA 自动建表万一 DDL 不一样，列类型/长度错了，数据全坏 | **Flyway V1 直接从现有数据库 pg_dump 导出**；JPA `ddl-auto=validate`（只校验 Entity 和表对不对，不自动改表），错了启动直接报错，不会破坏数据 |
| R07 | 前台 Wiki 已上线，Cookie `_pw_auth_session` 里存了上万真实用户的登录状态，改 Cookie 名/属性的话用户要全重登 | **Spring Session Redis 100% 保持原样**：Cookie 名=`_pw_auth_session`、HttpOnly=true、SameSite=Lax、domain/path 都和 Go 版一致，**老用户打开 Wiki 免登录无缝切换** |
| R08 | 前端 SSE 解析是按 Go 版写的：数据行 `data: xxx`、结束行 `done: xxx`、错误行 `error: xxx`，改格式的话前端要全改 | **Spring SseEmitter 严格按 Go 版事件流格式输出**：每个事件的字段名、换行符、分隔符全一致，前端 eventSource 代码不用动 |
| R09 | Pro/Enterprise 商业版的 License 验证逻辑是加密/闭源的，社区版搞不到 | **Community 功能先全部落地**，Pro/ENT 功能点（多租户/高级权限/企业机器人）先写接口 + 注释占位，`ValidateLicenseEdition()` 默认返回 Community，等商业版再补 |
| R10 | 旧 Go 版的 Telemetry 使用统计是加密上报的，搞不好有合规风险，开源版本直接带上报会被骂 | **默认关闭 Telemetry + Client 留空实现**，配置项开关打开才真正上报（默认关）；合规安全不踩雷 |

---

## 十三、重构里程碑（8 个阶段 · 大白话说明 + 当前进度）

| 阶段 | 做哪些模块/事情（人话） | 怎么验收算通过？ | 当前状态 |
|---|---|---|---|
| 🚩 阶段 0 | **搭骨架**：15 项决策全部确认、backend-java Gradle 项目能编译、Spring Boot 启动访问 `/ping` 返回 pong、Security 占位配置 + JPA JSONB + Jackson snake_case 都配上 | 拉代码 gradle bootRun 能起来，浏览器访问 /ping 不报错 | ✅ 已完成（2026-08-03） |
| 🚩 阶段 1 | **用户认证**：M01 用户 + M02 认证，Flyway V1 建 6 张表，JWT 登录返回和 Go 一模一样，4 层鉴权链通，SPEL 4 维权限能拦，密码 PBKDF2→BCrypt 兼容校验，登录限流 5 次/30min，超管账号初始化 Runner | 管理后台登录成功→访问受保护接口 OK→访问没权限的接口返回 403；Testcontainers 集成测试全绿 | ✅ 已完成（2026-08-03） |
| 🚩 阶段 2 | **知识库核心**：M03 KB + M04 Node（含 D12 double 间隙排序 + reBalance）+ M05 NavTree；4 级 KB 成员权限；文档草稿/发布；收藏夹/最近访问 Redis ZSet；全接口 `@PreAuthorize` 权限打通 | 拖拽文档到文件夹中间，position 自动=（父+子）/2；连续插 100 个节点不触发 reBalance；Go 版导出的测试数据导入后排序 100% 一致 | ✅ 已完成（2026-08-03） |
| 🔴 **阶段 3** | **AI 基础能力（下一个开工！）**：M06 模型配置（CRUD + 测试连接 + 激活）+ M07 AI 对话（SSE 流式+引用+Token 计数+反馈）+ M08 单轮创作（续写/润色/摘要/翻译 6 个 Prompt 模板）；定义 ModelProvider 统一接口，落地 5 家 OpenAI 兼容厂商 + HTTP 签名 | 后台配一个 Ollama 本地模型→激活→前台对话框问问题→打字机效果出来→引用里有对应文档→models 表的 token_counters 数字对 | 🔴 下一个（待你确认开工） |
| 🟡 阶段 4 | **内容导入导出**：M09 抓取导入（URL/Sitemap/RSS/EPUB + 语雀/Notion/飞书 3 家平台先做）+ M11 文件上传（AWS SDK v2 S3 Put/Presigned）+ M15 系统设置（全局屏蔽词+AI 默认提示词 CRUD） | 贴一个 Notion 页面公开 URL → 2 分钟后在对应 KB 下生成对应文档；上传 10MB PDF 不报错；设置屏蔽词「测试」→ 输入框内容含「测试」自动过滤 | 🟡 待定（阶段 3 完了做） |
| 🟡 阶段 5 | **应用集成 + 异步**：M10 应用集成（站点配置 + 分享 Widget + 钉钉/飞书 2 家机器人先接 + MCP 基础）+ M16 RAG 异步学习（Spring NATS Consumer 完整实现 + 失败自动重试 3 次）+ M17 Cron（@Scheduled 小时聚合/文档重试/License 检查） | 保存一篇 1 万字文档 → 30 秒后 rag_info.status 变 SUCCESS；钉钉机器人群里 @机器人提问 → 引用 Wiki 回答；整点过后 5 分钟 stat_hours 表有新数据 | 🟡 待定 |
| 🟡 阶段 6 | **前台共享 + 统计评论 + 迁移**：M14 前台共享（ShareAuthFilter 完整 3 态鉴权 + Sitemap 生成）+ M12 统计（PV/UV/热度榜/Ticket 账单接口）+ M13 评论反馈（CRUD + 后台审核）+ M18 Flyway 迁移脚本全链路（V1 初始化 + V2/V3 增量脚本） | 把 Go 版生产数据库备份导入 Java 版 → Flyway 启动没报错 → 前台访客打开 Wiki→未公开的 KB 弹密码框→输对密码看内容 | 🟡 待定 |
| 🟡 阶段 7 | **全量回归对接**：前端 web/admin + web/app 对接，对比 Go 版和 Java 版 50+ 核心接口响应（字段名/分页格式/错误码），记录差异最小化清单，写部署文档（Dockerfile/K8s/环境变量清单） | 切 10% 流量到 Java 后端一周，对比 Sentry 错误率≤Go 版、接口 P95 延迟≤Go 版；前端团队零改动或改动 ≤ 5 个文件 | 🟡 最后做 |

---

## 🎯 一句话总总结

**PandaWiki = 企业知识库 + AI 问答；现在正把后端从 Go 迁 Java；迁的过程中，前端 0 改动、数据库 0 改动、NATS 协议 0 改动、用户登录状态 0 变动；按 M01→M18 模块顺序一个一个落地，现在做到阶段 2，下一步就做 AI 模型/对话/创作（阶段 3）。**

API Key：
https://cloud.siliconflow.cn