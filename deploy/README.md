# PandaWiki 部署脚本使用说明

本文档说明如何使用自动化脚本来部署 PandaWiki API 服务的更新版本。

## 脚本组成

1. [local-deploy.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/local-deploy.sh) - 本地运行脚本（用于部署后端API服务）
2. [remote-deploy.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/remote-deploy.sh) - 服务端运行脚本（用于部署后端API服务）
3. [local-deploy-admin.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/local-deploy-admin.sh) - 本地运行脚本（用于部署前端管理界面）
4. [remote-deploy-admin.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/remote-deploy-admin.sh) - 服务端运行脚本（用于部署前端管理界面）

## 使用步骤

### 1. 配置本地脚本

编辑 [local-deploy.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/local-deploy.sh) 或 [local-deploy-admin.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/local-deploy-admin.sh) 文件，设置以下变量：

```bash
SERVER_IP=""  # 目标服务器IP地址
SERVER_USER=""  # 服务器用户名
SERVER_PATH="/tmp"  # 服务器上存储镜像的路径（默认为/tmp）
SSH_KEY_PATH=""  # SSH密钥路径（如果使用密钥认证）
```

### 2. 运行本地脚本

对于后端API服务：
```bash
cd /Users/aaronzheng/Projects/PandaWiki/deploy
./local-deploy.sh
```

对于前端管理界面：
```bash
cd /Users/aaronzheng/Projects/PandaWiki/deploy
./local-deploy-admin.sh
```

此脚本将执行以下操作：
- 使用 `make build` 或 `make image` 构建最新的 Docker镜像
- 将镜像保存为 tar 文件
- 通过 SCP 将 tar 文件传输到服务器
- 清理本地临时文件

### 3. 配置远程脚本

编辑 [remote-deploy.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/remote-deploy.sh) 或 [remote-deploy-admin.sh](file:///Users/aaronzheng/Projects/PandaWiki/deploy/remote-deploy-admin.sh) 文件，设置以下变量：

```bash
PROJECT_PATH=""  # PandaWiki项目在服务器上的路径，例如: /opt/pandawiki
```

### 4. 运署到服务器

有两种方式在服务器上运行脚本：

#### 方式一：通过SSH远程执行
对于后端API服务：
```bash
ssh $SERVER_USER@$SERVER_IP 'bash -s' < deploy/remote-deploy.sh
```

对于前端管理界面：
```bash
ssh $SERVER_USER@$SERVER_IP 'bash -s' < deploy/remote-deploy-admin.sh
```

#### 方式二：将脚本复制到服务器并执行
对于后端API服务：
```bash
scp deploy/remote-deploy.sh $SERVER_USER@$SERVER_IP:/tmp/
ssh $SERVER_USER@$SERVER_IP "chmod +x /tmp/remote-deploy.sh && /tmp/remote-deploy.sh"
```

对于前端管理界面：
```bash
scp deploy/remote-deploy-admin.sh $SERVER_USER@$SERVER_IP:/tmp/
ssh $SERVER_USER@$SERVER_IP "chmod +x /tmp/remote-deploy-admin.sh && /tmp/remote-deploy-admin.sh"
```

## 脚本功能详解

### local-deploy.sh
1. 使用项目的 Makefile 构建Docker镜像
2. 将镜像保存为tar文件
3. 通过SCP传输到服务器
4. 清理本地临时文件

### remote-deploy.sh
1. 加载传输过来的Docker镜像
2. 停止指定的服务
3. 删除旧的容器
4. 使用新镜像启动服务（通过 `--no-deps`、`--no-recreate` 和 `--pull never` 参数确保使用本地镜像）
5. 检查容器运行状态
6. 清理临时文件

### local-deploy-admin.sh
1. 使用项目的 Makefile 构建前端代码和Docker镜像
2. 将镜像保存为tar文件
3. 通过SCP传输到服务器
4. 清理本地临时文件

### remote-deploy-admin.sh
1. 加载传输过来的Docker镜像
2. 停止指定的服务
3. 删除旧的容器
4. 使用新镜像启动服务（通过 `--no-deps`、`--no-recreate` 和 `--pull never` 参数确保使用本地镜像）
5. 检查容器运行状态
6. 清理临时文件

## 注意事项

1. 确保本地Docker服务正在运行
2. 确保能够通过SSH访问目标服务器
3. 确保服务器上已安装Docker和Docker Compose
4. 确保服务器上有足够的磁盘空间存储镜像文件
5. 根据实际环境调整脚本中的路径和配置参数
6. 确保在运行本地脚本之前已经提交了所有代码更改，因为构建过程会使用当前的代码状态