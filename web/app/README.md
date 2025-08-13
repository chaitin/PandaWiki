# PandaWiki

## 项目描述

PandaWiki 是一个基于 Next.js 的 Wiki 知识库系统，支持文档管理、搜索和分类功能。

## 技术栈

- **前端框架**: Next.js 15.3.2, React 19
- **UI 组件库**: Material-UI (@mui/material 7.1.0)
- **状态管理**: 内置 React Hooks
- **Markdown 解析**: markdown-it, react-markdown
- **代码规范**: ESLint, TypeScript 5
- **包管理**: pnpm
- **API 文档**: cx-swagger-api

## 安装与运行

1. 克隆项目：
   ```bash
   git clone https://github.com/your-repo/PandaWiki.git
   ```
2. 安装依赖：
   ```bash
   pnpm install
   ```
3. 配置环境变量：
   - 在项目根目录下，新建文件 `.env.local` , 根据需求修改环境变量，实际字段如下：

     ```env
     # 目标服务配置
     TARGET=http://your_target_ip:8000 # 后端服务地址
     STATIC_FILE_TARGET=https://your_static_file_ip:2443 # 静态文件服务地址

     # 开发相关
     DEV_KB_ID=your_dev_kb_id # 开发环境知识库ID

     # Swagger 配置
     SWAGGER_BASE_URL=http://your_swagger_ip:8000 # Swagger API 文档地址
     SWAGGER_AUTH_TOKEN=your_swagger_token # Swagger 认证令牌
     ```

4. 启动开发服务器：
   ```bash
   pnpm dev
   ```
5. 构建生产版本：
   ```bash
   pnpm build
   ```
6. 启动生产服务器：
   ```bash
   pnpm start
   ```

## 可用命令

- `pnpm dev`: 开发模式 (端口 3010)
- `pnpm build`: 构建生产版本
- `pnpm start`: 启动生产服务器
- `pnpm lint`: 代码检查
- `pnpm api`: 生成 API 文档(环境变量需提供 `SWAGGER_BASE_URL`、`SWAGGER_AUTH_TOKEN`)

## 开发指南

1. 确保代码符合 ESLint 和 Stylelint 规范。
2. 如需代码格式化，运行：
   ```bash
   pnpm format
   ```
3. 提交 Pull Request 时描述清楚改动内容。
