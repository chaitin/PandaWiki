FROM node:20-alpine AS builder

# 接收宿主机缓存路径
ARG NODE_MODULES_CACHE
ARG PNPM_STORE_CACHE

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 1. 尝试从宿主机缓存恢复 node_modules
RUN if [ -d "$NODE_MODULES_CACHE" ] && [ "$(ls -A $NODE_MODULES_CACHE)" ]; then \
      mkdir -p /app/node_modules && \
      cp -r "$NODE_MODULES_CACHE"/* /app/node_modules/; \
    fi

# 2. 设置 pnpm store 路径
RUN if [ -d "$PNPM_STORE_CACHE" ]; then \
      pnpm config set store-dir "$PNPM_STORE_CACHE"; \
    fi

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prefer-offline

# 保存缓存
RUN if [ "$GITHUB_EVENT_NAME" != "pull_request" ] && [ -n "$NODE_MODULES_CACHE" ]; then \
      mkdir -p "$NODE_MODULES_CACHE" && \
      rm -rf "$NODE_MODULES_CACHE"/* && \
      cp -r /app/node_modules/* "$NODE_MODULES_CACHE/"; \
    fi

COPY . .
COPY .env .env
RUN pnpm run build

# 生产阶段
FROM node:20-alpine
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]