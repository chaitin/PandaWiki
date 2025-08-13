# PandaWiki Admin

## 项目概述

PandaWiki Admin 是一个基于现代前端技术栈构建的管理后台，用于管理 PandaWiki 的内容和功能。项目采用 React 19 和 Vite 作为开发工具，集成了丰富的 UI 组件和编辑器功能。

## 功能特性

- 富文本编辑：支持 Markdown 和 Tiptap 编辑器
- 拖拽排序：使用 DnD Kit 实现灵活的拖拽功能
- 图表展示：集成 ECharts 用于数据可视化
- 表单管理：基于 React Hook Form 实现动态表单
- API 文档生成：支持 Swagger API 自动生成

## 技术栈

- **前端框架**: React 19
- **构建工具**: Vite
- **UI 组件库**: Material-UI (MUI)
- **状态管理**: Redux Toolkit
- **路由**: React Router DOM
- **富文本编辑器**: Tiptap

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

### 其他命令

- 下载图标资源：`pnpm icon`
- 生成 API 文档：`pnpm api`

## 环境配置

- 开发环境变量文件：`.env.local`
- 生产环境配置：`nginx.conf` 和 `Dockerfile`

## 项目结构

```
├── src/                  # 源代码目录
├── public/               # 静态资源
├── scripts/              # 脚本工具
├── api-templates/        # API 模板
├── dist/                 # 构建输出
├── ssl/                  # SSL 证书
└── ...
```
