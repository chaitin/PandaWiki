FROM node:22-alpine

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# 复制 public 目录（standalone 从 /app 运行，需 /app/public）
COPY --chown=nextjs:nodejs public ./public

# 复制 standalone 构建输出（server.js 在 standalone 根目录，即 dist/standalone/server.js）
COPY --chown=nextjs:nodejs dist/standalone ./

# 复制静态资源到 .next/static（standalone 不包含 static，需手动复制）
COPY --chown=nextjs:nodejs dist/static ./.next/static

USER nextjs
EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

# 与 dev 一致：启动时打印日志；standalone 入口为根目录 server.js
CMD ["sh", "-c", "echo '🚀 panda-wiki-app container starting' && echo '🎯 Starting Next.js server (port 3010)...' && echo '   访问地址: http://0.0.0.0:3010' && echo '' && exec node server.js"]