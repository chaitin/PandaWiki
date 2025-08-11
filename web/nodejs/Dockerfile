FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile --prod

# 复制源代码
COPY . .

# 更改文件所有权
RUN chown -R appuser:nodejs /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "index.js"]
