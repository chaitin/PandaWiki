# ============================================
# PandaWiki Wiki 前台（Next.js 16 standalone）
# pnpm workspaces monorepo 构建
# next.config.ts 自定义了 distDir: 'dist' + output: 'standalone'
# 构建产物：dist/standalone / dist/static
# ⚠️ 重要：context 必须是 web/ 根（pnpm-lock.yaml 在那）
# ============================================

# ---------- 阶段 1：构建 ----------
FROM node:22-alpine AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# 生产构建关闭 Sentry source map 上传（没有 token）
ENV SENTRY_AUTH_TOKEN=
ENV SENTRY_ORG=

WORKDIR /app

RUN npm install -g pnpm@10

# ① 复制 workspace 根（package.json / lock / 全部 packages）
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages/

# ② 复制 app 工程全部文件（但排除 node_modules / .git / dist）
COPY app/package.json app/tsconfig.json app/next.config.ts ./app/
COPY app/public ./app/public
COPY app/src ./app/src
COPY app/api-templates ./app/api-templates
# 单独复制 app 根的零散文件
COPY app/.prettierignore app/eslint.config.mjs app/prettier.config.js app/new-types.d.ts app/swagger.api.config.ts ./app/
COPY app/sentry.edge.config.ts app/sentry.server.config.ts ./app/

# ③ 安装 pnpm workspace（admin 不存在没关系，--filter 单独也能装）
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# ④ 构建
WORKDIR /app/app
RUN pnpm build

# ---------- 阶段 2：运行时 ----------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app
USER nextjs

# next.config.ts: distDir=dist + output=standalone
# standalone 根里有 server.js 和 node_modules
COPY --from=builder --chown=nextjs:nodejs /app/app/dist/standalone ./
# Next 16 standalone 的 static 一般在：./dist/static（相对 standalone 根）
COPY --from=builder --chown=nextjs:nodejs /app/app/dist/static ./dist/static
# public 资源
COPY --from=builder --chown=nextjs:nodejs /app/app/public ./public

EXPOSE 3010
ENV PORT=3010
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]