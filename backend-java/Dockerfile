# ============================================
# 阶段 1：Gradle 编译（JDK 21 完整版）
# ============================================
FROM gradle:8.12-jdk21 AS builder

WORKDIR /app

# ① 先复制构建脚本，利用 Gradle 缓存
#    注意：gradle wrapper 只在 IDE 环境有，docker 镜像里自带 gradle 命令，所以 COPY gradle 找不到也没关系
COPY build.gradle.kts settings.gradle.kts gradle.properties /app/

# 下载依赖（不编译源码，充分利用缓存层；失败跳过，COPY src 后会再跑一次）
RUN gradle dependencies --no-daemon --console=plain 2>/dev/null || true

# ② 复制源码
COPY src /app/src/

# ③ 编译打包（跳过测试，Testcontainers 测试在容器外跑）
RUN gradle bootJar -x test --no-daemon --console=plain

# ============================================
# 阶段 2：运行时（JRE 21 slim 最小镜像 ~180MB）
# ============================================
FROM eclipse-temurin:21-jre-alpine AS runtime

# 安装必要工具（时区、curl 健康检查、字体）
RUN apk add --no-cache tzdata curl ca-certificates fontconfig ttf-dejavu && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 创建非 root 用户
RUN addgroup -S panda && adduser -S panda -G panda

WORKDIR /app

# 从 builder 阶段复制产物（先创建目录，防止 *.jar glob 匹配 0 个报错）
RUN mkdir -p build/libs
COPY --from=builder /app/build/libs/*.jar /app/panda-wiki.jar

# 数据目录
RUN mkdir -p /data/panda-wiki/uploads && chown -R panda:panda /data /app

USER panda

EXPOSE 8000

# 默认 JVM 参数（虚拟线程已由 spring.threads.virtual.enabled=true 自动开启）
ENV JAVA_OPTS="-Xms512m -Xmx2g -XX:MaxRAMPercentage=75.0 \
    -Djava.security.egd=file:/dev/./urandom \
    -Dfile.encoding=UTF-8 \
    --add-opens=java.base/java.lang=ALL-UNNAMED"

HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
    CMD curl -sf http://localhost:8000/api/v1/ping || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/panda-wiki.jar"]