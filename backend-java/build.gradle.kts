import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import java.time.Duration

// ============================================
// 注意：plugins DSL 解析期 gradle.properties 还没加载，
//       版本号必须写死（与 gradle.properties 保持一致）
// ============================================
plugins {
    java
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
    kotlin("plugin.jpa") version "2.0.21"
    kotlin("plugin.allopen") version "2.0.21"
    kotlin("plugin.noarg") version "2.0.21"
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.chaitin"
version = "2.11.1"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    maven { url = uri("https://maven.aliyun.com/repository/public") }
    maven { url = uri("https://maven.aliyun.com/repository/central") }
    maven { url = uri("https://maven.aliyun.com/repository/google") }
    maven { url = uri("https://maven.aliyun.com/repository/spring") }
    maven { url = uri("https://maven.aliyun.com/repository/spring-plugin") }
    mavenCentral()
}

// ============================================
// 版本常量（与 gradle.properties 保持同步，避免 plugins 块用 property 导致解析失败）
// ============================================
val hypersistenceUtilsVersion = "3.8.2"
val jjwtVersion = "0.12.6"
val springdocVersion = "2.7.0"
val mapstructVersion = "1.6.3"
val lombokVersion = "1.18.36"

dependencies {
    // ---------- Spring Boot 核心 ----------
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-mail")

    // ---------- 数据库：PostgreSQL + Flyway ----------
    runtimeOnly("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    implementation("io.hypersistence:hypersistence-utils-hibernate-63:$hypersistenceUtilsVersion")

    // ---------- 认证 / JWT ----------
    implementation("io.jsonwebtoken:jjwt-api:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jjwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jjwtVersion")
    implementation("commons-codec:commons-codec:1.17.1")
    implementation("com.knuddels:jtokkit:1.1.0")

    // ---------- OpenAPI / Swagger ----------
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:$springdocVersion")

    // ---------- 对象转换 ----------
    implementation("org.mapstruct:mapstruct:$mapstructVersion")
    annotationProcessor("org.mapstruct:mapstruct-processor:$mapstructVersion")
    annotationProcessor("org.projectlombok:lombok:$lombokVersion")
    compileOnly("org.projectlombok:lombok:$lombokVersion")

    // ---------- Kotlin 支持 ----------
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")

    // ---------- WebClient HTTP（AI/RAG/机器人调用） ----------
    implementation("org.springframework:spring-webflux")

    // ---------- 工具库 ----------
    implementation("cn.hutool:hutool-all:5.8.32")
    implementation("com.bucket4j:bucket4j-core:8.10.1")
    implementation("org.jsoup:jsoup:1.18.1")
    implementation("org.apache.commons:commons-csv:1.11.0")
    implementation("com.google.zxing:core:3.5.3")
    implementation("com.google.zxing:javase:3.5.3")

    // ---------- 缓存：Caffeine 一级 ----------
    implementation("com.github.ben-manes.caffeine:caffeine:3.1.8")

    // ---------- M11 文件存储：S3 兼容 + Tika 嗅探 ----------
    implementation(platform("software.amazon.awssdk:bom:2.29.17"))
    implementation("software.amazon.awssdk:s3")
    implementation("software.amazon.awssdk:url-connection-client")
    implementation("org.apache.tika:tika-core:2.9.2")
    implementation("org.apache.tika:tika-parsers-standard-package:2.9.2")

    // ---------- M09 抓取：HTML → Markdown ----------
    implementation("com.vladsch.flexmark:flexmark-all:0.64.8")
    implementation("com.vladsch.flexmark:flexmark-ext-tables:0.64.8")
    implementation("com.vladsch.flexmark:flexmark-ext-gfm-tasklist:0.64.8")
    compileOnly("com.microsoft.playwright:playwright:1.48.0")

    // ---------- M10 应用机器人 Webhook（轻量 HTTP） ----------

    // ---------- D8 NATS 发布订阅（阶段 3 再接入；starter 0.5.13 不存在，避免编译失败） ----------
    // implementation("io.nats:nats-spring-boot-starter:0.5.13")
    implementation("io.nats:jnats:2.20.4")

    // ---------- M17 统计数学聚合 ----------
    implementation("org.apache.commons:commons-math3:3.6.1")
    implementation("io.projectreactor:reactor-core")

    // ---------- 可观测（Sentry + OTEL + Prometheus） ----------
    implementation("io.sentry:sentry-spring-boot-starter-jakarta:7.18.0")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.micrometer:micrometer-tracing-bridge-otel")
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")

    // ---------- 开发期 ----------
    developmentOnly("org.springframework.boot:spring-boot-devtools")

    // ---------- 测试 ----------
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation(platform("org.testcontainers:testcontainers-bom:1.20.3"))
    testImplementation("org.testcontainers:testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("com.redis:testcontainers-redis:2.0.1")
    testImplementation("org.testcontainers:localstack")
    testImplementation("io.nats:nats-jetstream-test:2.20.4")
    testImplementation("io.rest-assured:kotlin-extensions:5.5.0")
    testImplementation("io.rest-assured:spring-mock-mvc:5.5.0")
    testImplementation("org.skyscreamer:jsonassert:1.5.3")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

// ============================================
// 自定义任务：迁移校验（阶段 7 M18）
// ============================================
tasks.register<JavaExec>("migrationVerify") {
    group = "panda-wiki"
    description = "迁移校验：Go 生产库与 Java 新库 28 表 count+JSONB 抽样对比（输出 HTML 报告）"
    classpath = sourceSets["main"].runtimeClasspath
    mainClass.set("com.chaitin.pandawiki.service.MigrationVerifyLauncher")
    jvmArgs = listOf(
        "-Dfile.encoding=UTF-8",
        "--add-opens=java.base/java.nio=ALL-UNNAMED"
    )
    args = listOf("--migration=verify", "--spring.profiles.active=migration")
    @Suppress("UNCHECKED_CAST")
    environment = System.getenv() as Map<String, Any>
}

// ============================================
// 自定义任务：全链路集成测试（Testcontainers）
// ============================================
tasks.register<Test>("integrationTest") {
    group = "verification"
    description = "运行全链路集成测试（需要 Docker 运行 Testcontainers）"
    useJUnitPlatform { includeTags("IntegrationTest") }
    timeout.set(Duration.ofMinutes(20))
    systemProperty("testcontainers.reuse.enable", "true")
    jvmArgs = listOf("-Xmx2048m")
}

// ============================================
// 编译选项
// ============================================
tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs += listOf(
            "-Xjsr305=strict",
            "-Xjvm-default=all"
        )
        jvmTarget = "21"
    }
}

tasks.withType<JavaCompile> {
    options.encoding = "UTF-8"
    options.release.set(21)
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// ============================================
// Kotlin noarg / allopen 注解（JPA Entity / Spring Bean 专用）
// ============================================
noArg {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
allOpen {
    annotation("org.springframework.stereotype.Component")
    annotation("org.springframework.stereotype.Service")
    annotation("org.springframework.stereotype.Repository")
    annotation("org.springframework.context.annotation.Configuration")
    annotation("org.springframework.scheduling.annotation.Async")
    annotation("org.springframework.transaction.annotation.Transactional")
    annotation("jakarta.persistence.Entity")
}

// ============================================
// BootJar 输出：build/libs/panda-wiki-api.jar
// ============================================
tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveBaseName.set("panda-wiki-api")
    archiveClassifier.set("")
}
