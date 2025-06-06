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
COPY .env .env

# 构建应用
RUN pnpm run build

FROM node:20-alpine

COPY --from=builder /app/public ./public
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3010

ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
