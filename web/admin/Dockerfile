FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 首先复制缓存的 node_modules 和 .pnpm-store（如果存在）
COPY --from=ghcr.io/actions/cache:latest /node_modules ./node_modules
COPY --from=ghcr.io/actions/cache:latest /.pnpm-store ./.pnpm-store

# 复制依赖相关文件
COPY package.json pnpm-lock.yaml ./

# 如果缓存不存在，则安装依赖
RUN if [ ! -d "node_modules" ]; then \
    pnpm install --frozen-lockfile --prefer-offline; \
    fi

# 然后复制其他源代码文件
COPY . .

# 添加构建参数
ARG BUILD_TYPE=saas

# 构建应用
RUN pnpm run build

# 使用 nginx 作为生产环境的基础镜像
FROM nginx:alpine

# 只复制构建产物和配置文件
COPY --from=builder /app/dist /opt/frontend/dist
COPY --from=builder /app/server.conf /etc/nginx/conf.d/server.conf
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/ssl /etc/nginx/ssl

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]

