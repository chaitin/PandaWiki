FROM node:20-alpine AS builder

# 接收宿主机缓存路径
ARG NODE_MODULES_CACHE
ARG PNPM_STORE_CACHE

WORKDIR /admin

# 安装 pnpm
RUN npm install -g pnpm

# 1. 尝试从宿主机缓存恢复 node_modules
RUN if [ -d "$NODE_MODULES_CACHE" ] && [ "$(ls -A $NODE_MODULES_CACHE)" ]; then \
      echo "Restoring node_modules from cache..." && \
      mkdir -p /admin/node_modules && \
      cp -r "$NODE_MODULES_CACHE"/* /admin/node_modules/; \
    else \
      echo "No node_modules cache found"; \
    fi

# 2. 设置 pnpm store 路径
RUN if [ -d "$PNPM_STORE_CACHE" ]; then \
      pnpm config set store-dir "$PNPM_STORE_CACHE"; \
    fi

# 3. 复制依赖定义文件
COPY package.json pnpm-lock.yaml ./

# 4. 安装依赖（如果 node_modules 不存在或无效）
RUN pnpm install --frozen-lockfile --prefer-offline

# 5. 保存 node_modules 回缓存（非 PR 构建时）
RUN if [ "$GITHUB_EVENT_NAME" != "pull_request" ] && [ -n "$NODE_MODULES_CACHE" ]; then \
      echo "Saving node_modules to cache..." && \
      mkdir -p "$NODE_MODULES_CACHE" && \
      rm -rf "$NODE_MODULES_CACHE"/* && \
      cp -r /admin/node_modules/* "$NODE_MODULES_CACHE/"; \
    fi

# 6. 复制其他文件并构建
COPY . .
ARG BUILD_TYPE=saas
RUN pnpm run build

# 生产阶段
FROM nginx:alpine
COPY --from=builder /admin/dist /opt/frontend/dist
COPY --from=builder /admin/server.conf /etc/nginx/conf.d/server.conf
COPY --from=builder /admin/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /admin/ssl /etc/nginx/ssl
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]